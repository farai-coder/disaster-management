"""
Notification service - handles in-app notifications and intelligent routing.
"""

import re
from sqlalchemy.orm import Session
from models import Notification, AuthorityType, IncidentCategory

# Maps incident categories to base responsible authority types.
CATEGORY_AUTHORITY_MAP = {
    IncidentCategory.CRIME: [AuthorityType.POLICE],
    IncidentCategory.FIRE: [AuthorityType.FIRE_DEPARTMENT, AuthorityType.HEALTH],
    IncidentCategory.ACCIDENT: [AuthorityType.POLICE, AuthorityType.HEALTH],
    IncidentCategory.DISEASE_OUTBREAK: [AuthorityType.HEALTH],
    IncidentCategory.CYCLONE_FLOOD: [AuthorityType.CIVIL_PROTECTION, AuthorityType.HEALTH],
    IncidentCategory.DROUGHT: [AuthorityType.CIVIL_PROTECTION],
    IncidentCategory.OTHER: [AuthorityType.CIVIL_PROTECTION, AuthorityType.POLICE],
}

# Keywords that suggest an incident also requires a particular authority,
# regardless of the chosen category. Used for intelligent multi-routing
# (e.g., "head-on collision and the cars caught fire" -> add FIRE_DEPARTMENT).
KEYWORD_AUTHORITY_HINTS = {
    AuthorityType.FIRE_DEPARTMENT: [
        "fire", "burning", "burnt", "smoke", "explosion", "blaze", "flame", "flames",
    ],
    AuthorityType.HEALTH: [
        "injured", "injury", "hurt", "bleeding", "ambulance", "wounded",
        "casualty", "casualties", "trapped", "unconscious", "overdose",
        "cardiac", "stroke", "outbreak", "cholera", "typhoid", "covid",
    ],
    AuthorityType.POLICE: [
        "assault", "robbery", "theft", "stolen", "weapon", "gun", "knife",
        "fight", "stabbed", "shot", "kidnap", "hijack", "rape",
    ],
    AuthorityType.CIVIL_PROTECTION: [
        "flood", "flooding", "cyclone", "storm", "drought", "landslide",
        "evacuation", "evacuate", "collapse", "earthquake",
    ],
}


def _keyword_matches(text: str, auth_type: AuthorityType) -> bool:
    keywords = KEYWORD_AUTHORITY_HINTS.get(auth_type, [])
    for k in keywords:
        if re.search(rf"\b{re.escape(k)}\b", text):
            return True
    return False


def detect_authorities(title: str | None, description: str | None, category: IncidentCategory | None) -> list[AuthorityType]:
    """Return the union of category-based and keyword-detected authorities."""
    selected: list[AuthorityType] = []
    if category is not None:
        selected.extend(CATEGORY_AUTHORITY_MAP.get(category, []))
    text = f"{title or ''} {description or ''}".lower()
    if text.strip():
        for auth_type in KEYWORD_AUTHORITY_HINTS:
            if _keyword_matches(text, auth_type) and auth_type not in selected:
                selected.append(auth_type)
    if not selected:
        selected.append(AuthorityType.CIVIL_PROTECTION)
    return selected


def incident_targets_authority(incident, auth_type: AuthorityType) -> bool:
    """Decide whether the given incident should be visible to this authority type."""
    if incident.assigned_authority == auth_type:
        return True
    targets = detect_authorities(incident.title, incident.description, incident.category)
    return auth_type in targets


def get_responsible_authorities(category: IncidentCategory) -> list[AuthorityType]:
    return CATEGORY_AUTHORITY_MAP.get(category, [AuthorityType.CIVIL_PROTECTION])


def get_responsible_authority(category: IncidentCategory) -> AuthorityType:
    authorities = get_responsible_authorities(category)
    return authorities[0] if authorities else AuthorityType.CIVIL_PROTECTION


def create_incident_notification(db: Session, incident) -> list[Notification]:
    authorities = detect_authorities(incident.title, incident.description, incident.category)
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
