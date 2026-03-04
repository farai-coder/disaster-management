import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SAEnum
from database import Base
import enum


class IncidentCategory(str, enum.Enum):
    CRIME = "crime"
    FIRE = "fire"
    ACCIDENT = "accident"
    DISEASE_OUTBREAK = "disease_outbreak"
    CYCLONE_FLOOD = "cyclone_flood"
    DROUGHT = "drought"
    OTHER = "other"


class IncidentStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    FAKE = "fake"


class AuthorityType(str, enum.Enum):
    POLICE = "police"
    FIRE_DEPARTMENT = "fire_department"
    HEALTH = "health"
    CIVIL_PROTECTION = "civil_protection"
    ADMIN = "admin"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SAEnum(IncidentCategory), nullable=False)
    status = Column(SAEnum(IncidentStatus), default=IncidentStatus.PENDING)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(300), nullable=True)
    photo_url = Column(String(500), nullable=True)
    ai_suggested_category = Column(SAEnum(IncidentCategory), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    reporter_name = Column(String(100), nullable=True)
    reporter_contact = Column(String(100), nullable=True)
    assigned_authority = Column(SAEnum(AuthorityType), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Authority(Base):
    __tablename__ = "authorities"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    name = Column(String(100), nullable=False)
    authority_type = Column(SAEnum(AuthorityType), nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    category = Column(SAEnum(IncidentCategory), nullable=True)
    target_area = Column(String(300), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_km = Column(Float, nullable=True)
    issued_by = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, nullable=True)
    alert_id = Column(Integer, nullable=True)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)  # new_incident, status_update, alert
    is_read = Column(Boolean, default=False)
    target_authority_type = Column(SAEnum(AuthorityType), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
