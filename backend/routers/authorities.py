from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func

from database import get_db
from models import Authority, Incident, IncidentReport, Alert, Notification, IncidentCategory, IncidentStatus, AuthorityType
from schemas import (
    AuthorityCreate, AuthorityLogin, AuthorityResponse, PasswordChange,
    TokenResponse, DashboardStats, IncidentResponse,
)
from services.authority_offices import EMERGENCY_NUMBERS, AUTHORITY_OFFICES, nearest_offices
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/authorities", tags=["Authorities"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "disaster-mgmt-secret-key-change-in-production"
ALGORITHM = "HS256"


def create_token(authority_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode({"sub": str(authority_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=AuthorityResponse)
def register_authority(data: AuthorityCreate, db: Session = Depends(get_db)):
    existing = db.query(Authority).filter(Authority.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    authority = Authority(
        username=data.username,
        password_hash=pwd_context.hash(data.password),
        name=data.name,
        authority_type=data.authority_type,
        department=data.department,
    )
    db.add(authority)
    db.commit()
    db.refresh(authority)
    return authority


@router.post("/login", response_model=TokenResponse)
def login(data: AuthorityLogin, db: Session = Depends(get_db)):
    authority = db.query(Authority).filter(Authority.username == data.username).first()
    if not authority or not pwd_context.verify(data.password, authority.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(authority.id)
    return TokenResponse(
        access_token=token,
        authority=AuthorityResponse.model_validate(authority),
    )


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    authority_type: str | None = None,
    db: Session = Depends(get_db),
):
    base_query = db.query(Incident)
    if authority_type:
        from services.notification import CATEGORY_AUTHORITY_MAP
        try:
            atype = AuthorityType(authority_type)
            relevant = [c for c, auths in CATEGORY_AUTHORITY_MAP.items() if atype in auths]
            base_query = base_query.filter(
                (Incident.assigned_authority == authority_type) | (Incident.category.in_(relevant))
            )
        except ValueError:
            base_query = base_query.filter(Incident.assigned_authority == authority_type)

    total = base_query.count()
    pending = base_query.filter(Incident.status == IncidentStatus.PENDING).count()
    verified = base_query.filter(Incident.status == IncidentStatus.VERIFIED).count()
    in_progress = base_query.filter(Incident.status == IncidentStatus.IN_PROGRESS).count()
    resolved = base_query.filter(Incident.status == IncidentStatus.RESOLVED).count()
    fake = base_query.filter(Incident.status == IncidentStatus.FAKE).count()
    active_alerts = db.query(Alert).filter(Alert.is_active == True).count()

    category_counts = (
        base_query
        .with_entities(Incident.category, func.count(Incident.id))
        .group_by(Incident.category)
        .all()
    )
    incidents_by_category = {cat.value: count for cat, count in category_counts}

    recent = (
        base_query
        .order_by(Incident.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardStats(
        total_incidents=total,
        pending_incidents=pending,
        verified_incidents=verified,
        in_progress_incidents=in_progress,
        resolved_incidents=resolved,
        fake_incidents=fake,
        active_alerts=active_alerts,
        incidents_by_category=incidents_by_category,
        recent_incidents=[IncidentResponse.model_validate(i) for i in recent],
    )


@router.get("/notifications")
def get_notifications(
    authority_type: str | None = None,
    unread_only: bool = True,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Notification).order_by(Notification.created_at.desc())
    if authority_type:
        query = query.filter(
            (Notification.target_authority_type == authority_type) |
            (Notification.target_authority_type == None)
        )
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.limit(limit).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"detail": "Marked as read"}


@router.patch("/{authority_id}/password")
def change_password(authority_id: int, payload: PasswordChange, db: Session = Depends(get_db)):
    authority = db.query(Authority).filter(Authority.id == authority_id).first()
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")
    if not pwd_context.verify(payload.current_password, authority.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    authority.password_hash = pwd_context.hash(payload.new_password)
    db.commit()
    return {"detail": "Password updated"}


@router.get("/emergency-numbers")
def list_emergency_numbers():
    """Public toll-free emergency numbers for Zimbabwe."""
    return {"numbers": EMERGENCY_NUMBERS}


@router.get("/offices/all")
def list_all_offices():
    return {
        "offices": [
            {
                "name": o["name"],
                "type": o["type"].value,
                "city": o["city"],
                "latitude": o["lat"],
                "longitude": o["lon"],
                "phone": o["phone"],
            }
            for o in AUTHORITY_OFFICES
        ]
    }


@router.get("/offices/nearest")
def list_nearest_offices(
    lat: float = Query(...),
    lon: float = Query(...),
    authority_type: str | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
):
    types = None
    if authority_type:
        try:
            types = [AuthorityType(authority_type)]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid authority_type")
    return {"offices": nearest_offices(lat, lon, types, limit=limit)}


@router.delete("/demo/reset")
def reset_demo_data(
    confirm: bool = Query(False, description="Must be true to actually wipe data"),
    db: Session = Depends(get_db),
):
    """Quickly remove all demo incidents, alerts, notifications, and responder reports."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to wipe demo data")
    deleted = {
        "incidents": db.query(Incident).delete(),
        "incident_reports": db.query(IncidentReport).delete(),
        "alerts": db.query(Alert).delete(),
        "notifications": db.query(Notification).delete(),
    }
    db.commit()
    return {"detail": "Demo data wiped", "deleted": deleted}


@router.get("/reports/summary")
def reports_summary(
    authority_type: str | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    """Aggregate report data for printable analytics."""
    q = db.query(Incident)
    if authority_type:
        try:
            atype = AuthorityType(authority_type)
            from services.notification import CATEGORY_AUTHORITY_MAP
            relevant = [c for c, auths in CATEGORY_AUTHORITY_MAP.items() if atype in auths]
            q = q.filter((Incident.assigned_authority == authority_type) | (Incident.category.in_(relevant)))
        except ValueError:
            pass
    if start:
        q = q.filter(Incident.created_at >= start)
    if end:
        q = q.filter(Incident.created_at <= end)

    incidents = q.order_by(Incident.created_at.desc()).all()

    by_category = {}
    by_status = {}
    by_day = {}
    for inc in incidents:
        by_category[inc.category.value] = by_category.get(inc.category.value, 0) + 1
        by_status[inc.status.value] = by_status.get(inc.status.value, 0) + 1
        day = inc.created_at.strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + 1

    alerts_q = db.query(Alert)
    if start:
        alerts_q = alerts_q.filter(Alert.created_at >= start)
    if end:
        alerts_q = alerts_q.filter(Alert.created_at <= end)
    total_alerts = alerts_q.count()
    active_alerts = alerts_q.filter(Alert.is_active == True).count()

    false_alarms = db.query(IncidentReport).filter(IncidentReport.is_false_alarm == True).count()

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "authority_type": authority_type,
        "range": {"start": start.isoformat() if start else None, "end": end.isoformat() if end else None},
        "totals": {
            "incidents": len(incidents),
            "alerts_total": total_alerts,
            "alerts_active": active_alerts,
            "false_alarms": false_alarms,
        },
        "by_category": by_category,
        "by_status": by_status,
        "by_day": by_day,
        "incidents": [
            {
                "id": i.id,
                "title": i.title,
                "category": i.category.value,
                "status": i.status.value,
                "location_name": i.location_name,
                "latitude": i.latitude,
                "longitude": i.longitude,
                "created_at": i.created_at.isoformat(),
                "assigned_authority": i.assigned_authority.value if i.assigned_authority else None,
            }
            for i in incidents
        ],
    }
