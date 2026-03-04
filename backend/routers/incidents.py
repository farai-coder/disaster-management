import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Incident, IncidentCategory, IncidentStatus
from schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from services.image_classifier import classify_image
from services.notification import create_incident_notification, get_responsible_authority

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=IncidentResponse)
async def create_incident(
    title: str = Form(...),
    description: str = Form(...),
    category: IncidentCategory = Form(...),
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
    ai_suggested = None

    if photo and photo.filename:
        ext = os.path.splitext(photo.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_url = f"/uploads/{filename}"

        result = classify_image(photo.filename, description)
        ai_suggested = result["suggested_category"]

    authority = get_responsible_authority(category)

    incident = Incident(
        title=title,
        description=description,
        category=category,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        photo_url=photo_url,
        ai_suggested_category=ai_suggested,
        is_anonymous=is_anonymous,
        reporter_name=None if is_anonymous else reporter_name,
        reporter_contact=None if is_anonymous else reporter_contact,
        assigned_authority=authority,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    create_incident_notification(db, incident)

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
    if authority:
        query = query.filter(Incident.assigned_authority == authority)
    return query.offset(offset).limit(limit).all()


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

    return incident


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
    return {"detail": "Incident deleted"}


@router.post("/classify-image")
async def classify_uploaded_image(
    photo: UploadFile = File(...),
    description: str = Form(""),
):
    result = classify_image(photo.filename, description)
    return result
