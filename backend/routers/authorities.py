from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func

from database import get_db
from models import Authority, Incident, Alert, Notification, IncidentCategory, IncidentStatus, AuthorityType
from schemas import (
    AuthorityCreate, AuthorityLogin, AuthorityResponse,
    TokenResponse, DashboardStats, IncidentResponse,
)
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
