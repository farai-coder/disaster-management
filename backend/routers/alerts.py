from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Alert
from schemas import AlertCreate, AlertResponse
from services.notification import create_alert_notification, simulate_sms_alert

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.post("/", response_model=AlertResponse)
def create_alert(
    alert_data: AlertCreate,
    issued_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    alert = Alert(
        **alert_data.model_dump(),
        issued_by=issued_by,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    create_alert_notification(db, alert)

    return alert


@router.get("/", response_model=list[AlertResponse])
def list_alerts(
    active_only: bool = Query(True),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if active_only:
        query = query.filter(Alert.is_active == True)
        query = query.filter(
            (Alert.expires_at == None) | (Alert.expires_at > datetime.now(timezone.utc))
        )
    if severity:
        query = query.filter(Alert.severity == severity)
    return query.limit(limit).all()


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/deactivate", response_model=AlertResponse)
def deactivate_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = False
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/simulate-sms")
def send_sms_alert(
    message: str = Query(...),
    phone_numbers: str = Query(..., description="Comma-separated phone numbers"),
):
    numbers = [n.strip() for n in phone_numbers.split(",")]
    result = simulate_sms_alert(numbers, message)
    return result
