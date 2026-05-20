import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Incident, IncidentReport, IncidentCategory, IncidentStatus, AuthorityType
from schemas import (
    IncidentCreate, IncidentUpdate, IncidentResponse,
    IncidentReportCreate, IncidentReportUpdate, IncidentReportResponse,
)
from services.notification import (
    create_incident_notification,
    get_responsible_authority,
    get_responsible_authorities,
    detect_authorities,
    incident_targets_authority,
    CATEGORY_AUTHORITY_MAP,
)
from services.authority_offices import nearest_offices
from services.events import publish

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=IncidentResponse)
async def create_incident(
    title: str = Form(...),
    description: str = Form(""),
    category: IncidentCategory = Form(IncidentCategory.OTHER),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_name: Optional[str] = Form(None),
    is_anonymous: bool = Form(False),
    reporter_name: Optional[str] = Form(None),
    reporter_contact: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    photo_url = None

    if photo and photo.filename:
        ext = os.path.splitext(photo.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_url = f"/uploads/{filename}"

    authority = get_responsible_authority(category)

    incident = Incident(
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        photo_url=photo_url,
        is_anonymous=is_anonymous,
        reporter_name=None if is_anonymous else reporter_name,
        reporter_contact=None if is_anonymous else reporter_contact,
        assigned_authority=authority,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    create_incident_notification(db, incident)

    # Find the nearest physical office of each responsible authority so the
    # dispatcher closest to the scene is the one actually paged.
    auth_types = detect_authorities(incident.title, incident.description, incident.category)
    nearest = nearest_offices(incident.latitude, incident.longitude, auth_types, limit=len(auth_types) or 1)
    publish(
        "incident_created",
        incident_id=incident.id,
        category=incident.category.value,
        status=incident.status.value,
        latitude=incident.latitude,
        longitude=incident.longitude,
        nearest_offices=nearest,
    )

    return incident


@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    category: Optional[IncidentCategory] = Query(None),
    status: Optional[IncidentStatus] = Query(None),
    authority: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Incident).order_by(Incident.created_at.desc())
    if category:
        query = query.filter(Incident.category == category)
    if status:
        query = query.filter(Incident.status == status)
    if not authority:
        return query.offset(offset).limit(limit).all()

    # Authority filter: include incidents where this authority is responsible
    # by category OR by keywords detected in title/description.
    try:
        auth_type = AuthorityType(authority)
    except ValueError:
        return query.filter(Incident.assigned_authority == authority).offset(offset).limit(limit).all()

    rows = query.all()
    matched = [inc for inc in rows if incident_targets_authority(inc, auth_type)]
    return matched[offset:offset + limit]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    update: IncidentUpdate,
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)

    db.commit()
    db.refresh(incident)

    from services.notification import create_status_notification
    create_status_notification(db, incident)

    publish("incident_updated", incident_id=incident.id, status=incident.status.value)
    return incident


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    publish("incident_deleted", incident_id=incident_id)
    return {"detail": "Incident deleted"}


@router.get("/{incident_id}/nearest-authorities")
def get_nearest_authorities(
    incident_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    types = detect_authorities(incident.title, incident.description, incident.category)
    return {
        "incident_id": incident.id,
        "responsible_types": [t.value for t in types],
        "offices": nearest_offices(incident.latitude, incident.longitude, types, limit=limit),
    }


@router.get("/reports/all")
def list_all_responder_reports(
    authority: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    """All responder reports, optionally filtered by authority type. Joins each report with its incident."""
    q = db.query(IncidentReport).order_by(IncidentReport.created_at.desc())
    if authority:
        try:
            auth_type = AuthorityType(authority)
            q = q.filter(IncidentReport.responder_authority == auth_type)
        except ValueError:
            pass
    reports = q.limit(limit).all()
    incident_ids = {r.incident_id for r in reports}
    incidents = {
        i.id: i for i in db.query(Incident).filter(Incident.id.in_(incident_ids)).all()
    }
    out = []
    for r in reports:
        inc = incidents.get(r.incident_id)
        out.append({
            "id": r.id,
            "incident_id": r.incident_id,
            "responder_name": r.responder_name,
            "responder_authority": r.responder_authority.value,
            "outcome": r.outcome,
            "notes": r.notes,
            "is_false_alarm": r.is_false_alarm,
            "created_at": r.created_at.isoformat(),
            "incident_title": inc.title if inc else None,
            "incident_category": inc.category.value if inc else None,
            "incident_status": inc.status.value if inc else None,
            "incident_location_name": inc.location_name if inc else None,
        })
    return out


@router.get("/{incident_id}/reports", response_model=list[IncidentReportResponse])
def list_incident_reports(incident_id: int, db: Session = Depends(get_db)):
    return (
        db.query(IncidentReport)
        .filter(IncidentReport.incident_id == incident_id)
        .order_by(IncidentReport.created_at.desc())
        .all()
    )


@router.post("/{incident_id}/reports", response_model=IncidentReportResponse)
def create_incident_report(
    incident_id: int,
    payload: IncidentReportCreate,
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if payload.incident_id != incident_id:
        raise HTTPException(status_code=400, detail="incident_id mismatch")

    report = IncidentReport(
        incident_id=incident_id,
        responder_name=payload.responder_name,
        responder_authority=payload.responder_authority,
        outcome=payload.outcome,
        notes=payload.notes,
        is_false_alarm=payload.is_false_alarm or payload.outcome == "false_alarm",
    )
    db.add(report)

    # If responder flagged false alarm, update incident status to fake
    if report.is_false_alarm:
        incident.status = IncidentStatus.FAKE
    elif payload.outcome == "resolved":
        incident.status = IncidentStatus.RESOLVED

    db.commit()
    db.refresh(report)
    publish("report_created", incident_id=incident_id, report_id=report.id)
    return report


@router.patch("/{incident_id}/reports/{report_id}", response_model=IncidentReportResponse)
def update_incident_report(
    incident_id: int,
    report_id: int,
    payload: IncidentReportUpdate,
    db: Session = Depends(get_db),
):
    report = (
        db.query(IncidentReport)
        .filter(IncidentReport.id == report_id, IncidentReport.incident_id == incident_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    data = payload.model_dump(exclude_unset=True)
    # Keep false-alarm flag in sync with outcome
    if "outcome" in data and "is_false_alarm" not in data:
        data["is_false_alarm"] = data["outcome"] == "false_alarm"

    for key, value in data.items():
        setattr(report, key, value)

    # If marked closed, also resolve the incident
    if data.get("is_closed"):
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident:
            if report.is_false_alarm:
                incident.status = IncidentStatus.FAKE
            else:
                incident.status = IncidentStatus.RESOLVED

    db.commit()
    db.refresh(report)
    publish("report_updated", incident_id=incident_id, report_id=report_id)
    return report


@router.delete("/{incident_id}/reports/{report_id}")
def delete_incident_report(incident_id: int, report_id: int, db: Session = Depends(get_db)):
    report = (
        db.query(IncidentReport)
        .filter(IncidentReport.id == report_id, IncidentReport.incident_id == incident_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    publish("report_deleted", incident_id=incident_id, report_id=report_id)
    return {"detail": "Report deleted"}
