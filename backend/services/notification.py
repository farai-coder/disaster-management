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

# Keywords and phrases that hint an incident also requires a particular authority,
# regardless of the chosen category. Used for intelligent multi-routing
# (e.g., "head-on collision and the cars caught fire" -> add FIRE_DEPARTMENT).
# Multi-word entries are matched as substrings; single words use word boundaries.
KEYWORD_AUTHORITY_HINTS = {
    AuthorityType.FIRE_DEPARTMENT: [
        "fire", "burning", "burnt", "smoke", "smoking",
        "explosion", "exploded", "explode", "blast", "blaze",
        "flame", "flames", "ignite", "ignited", "engulfed",
        "caught fire", "on fire", "set alight", "set ablaze",
        "burst into flames", "petrol leak", "fuel leak", "gas leak",
    ],
    AuthorityType.HEALTH: [
        "injured", "injury", "hurt", "bleeding", "ambulance", "wounded",
        "casualty", "casualties", "trapped", "unconscious", "overdose",
        "cardiac", "stroke", "outbreak", "cholera", "typhoid", "covid",
        "fatal", "fatality", "fatalities", "dying", "dead", "deaths",
        "broken", "fracture", "burnt", "burns", "burn victim",
        "medical", "first aid", "people hurt", "people injured",
    ],
    AuthorityType.POLICE: [
        "assault", "robbery", "theft", "stolen", "weapon", "gun", "knife",
        "fight", "stabbed", "shot", "kidnap", "hijack", "rape",
        "head-on", "head on", "collision", "crash", "rollover",
        "hit and run", "drunk driver", "reckless driving",
    ],
    AuthorityType.CIVIL_PROTECTION: [
        "flood", "flooding", "cyclone", "storm", "drought", "landslide",
        "evacuation", "evacuate", "collapse", "earthquake",
        "building collapse", "wall collapse", "mass casualty",
    ],
}


def _keyword_matches(text: str, auth_type: AuthorityType) -> bool:
    """Match phrases as substrings, single words on word boundaries."""
    for k in KEYWORD_AUTHORITY_HINTS.get(auth_type, []):
        if " " in k or "-" in k:
            if k in text:
                return True
        elif re.search(rf"\b{re.escape(k)}\b", text):
            return True
    return False


# Categories where any severe wording in the report should automatically
# bring in additional authorities (police on scene, fire on scene, ambulance).
SEVERITY_PHRASES = (
    "fire", "burning", "smoke", "explosion", "exploded", "blast",
    "caught fire", "on fire", "burst into flames", "engulfed",
    "trapped", "stuck inside", "people inside", "passengers trapped",
    "fuel leak", "petrol leak",
)


def detect_authorities(title: str | None, description: str | None, category: IncidentCategory | None) -> list[AuthorityType]:
    """Return category-based authorities plus any inferred from title/description."""
    selected: list[AuthorityType] = []
    if category is not None:
        selected.extend(CATEGORY_AUTHORITY_MAP.get(category, []))

    text = f"{title or ''} {description or ''}".lower()
    if text.strip():
        for auth_type in KEYWORD_AUTHORITY_HINTS:
            if _keyword_matches(text, auth_type) and auth_type not in selected:
                selected.append(auth_type)

        # An accident reported as severe (fire, trapped, explosion, etc.)
        # always needs police + ambulance + fire on scene.
        if category == IncidentCategory.ACCIDENT and any(p in text for p in SEVERITY_PHRASES):
            for auth in (AuthorityType.POLICE, AuthorityType.HEALTH, AuthorityType.FIRE_DEPARTMENT):
                if auth not in selected:
                    selected.append(auth)

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
