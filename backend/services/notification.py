"""
Notification service - handles in-app notifications and simulated SMS alerts.
"""

from sqlalchemy.orm import Session
from models import Notification, AuthorityType, IncidentCategory

# Maps incident categories to responsible authority types
CATEGORY_AUTHORITY_MAP = {
    IncidentCategory.CRIME: [AuthorityType.POLICE],
    IncidentCategory.FIRE: [AuthorityType.FIRE_DEPARTMENT],
    IncidentCategory.ACCIDENT: [AuthorityType.POLICE, AuthorityType.HEALTH],
    IncidentCategory.DISEASE_OUTBREAK: [AuthorityType.HEALTH],
    IncidentCategory.CYCLONE_FLOOD: [AuthorityType.CIVIL_PROTECTION],
    IncidentCategory.DROUGHT: [AuthorityType.CIVIL_PROTECTION],
    IncidentCategory.OTHER: [AuthorityType.ADMIN],
}


def get_responsible_authorities(category: IncidentCategory) -> list[AuthorityType]:
    return CATEGORY_AUTHORITY_MAP.get(category, [AuthorityType.ADMIN])


def get_responsible_authority(category: IncidentCategory) -> AuthorityType:
    authorities = get_responsible_authorities(category)
    return authorities[0] if authorities else AuthorityType.ADMIN


def create_incident_notification(db: Session, incident) -> list[Notification]:
    authorities = get_responsible_authorities(incident.category)
    notifications = []
    for authority in authorities:
        notification = Notification(
            incident_id=incident.id,
            message=f"New {incident.category.value} incident reported: {incident.title}",
            notification_type="new_incident",
            target_authority_type=authority,
        )
        db.add(notification)
        notifications.append(notification)
    db.commit()
    for n in notifications:
        db.refresh(n)
    return notifications


def create_status_notification(db: Session, incident) -> Notification:
    notification = Notification(
        incident_id=incident.id,
        message=f"Incident #{incident.id} status updated to {incident.status.value}",
        notification_type="status_update",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def create_alert_notification(db: Session, alert) -> Notification:
    notification = Notification(
        alert_id=alert.id,
        message=f"[{alert.severity.upper()}] {alert.title}: {alert.message[:100]}",
        notification_type="alert",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def simulate_sms_alert(phone_numbers: list[str], message: str) -> dict:
    """Simulate sending SMS alerts. In production, integrate with an SMS gateway."""
    return {
        "status": "simulated",
        "recipients": len(phone_numbers),
        "message_preview": message[:160],
        "note": "SMS sending simulated for prototype. Integrate Twilio/Africa's Talking in production.",
    }
