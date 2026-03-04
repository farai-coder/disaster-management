from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from models import IncidentCategory, IncidentStatus, AuthorityType


# --- Incident Schemas ---

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    category: IncidentCategory
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_name: Optional[str] = None
    is_anonymous: bool = False
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    assigned_authority: Optional[AuthorityType] = None
    category: Optional[IncidentCategory] = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: IncidentCategory
    status: IncidentStatus
    latitude: float
    longitude: float
    location_name: Optional[str]
    photo_url: Optional[str]
    ai_suggested_category: Optional[IncidentCategory]
    is_anonymous: bool
    reporter_name: Optional[str]
    reporter_contact: Optional[str]
    assigned_authority: Optional[AuthorityType]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Alert Schemas ---

class AlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    category: Optional[IncidentCategory] = None
    target_area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    expires_at: Optional[datetime] = None


class AlertResponse(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    category: Optional[IncidentCategory]
    target_area: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    radius_km: Optional[float]
    issued_by: Optional[int]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


# --- Authority Schemas ---

class AuthorityCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    name: str = Field(..., min_length=2, max_length=100)
    authority_type: AuthorityType
    department: Optional[str] = None


class AuthorityLogin(BaseModel):
    username: str
    password: str


class AuthorityResponse(BaseModel):
    id: int
    username: str
    name: str
    authority_type: AuthorityType
    department: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    authority: AuthorityResponse


# --- Stats ---

class DashboardStats(BaseModel):
    total_incidents: int
    pending_incidents: int
    verified_incidents: int
    in_progress_incidents: int
    resolved_incidents: int
    fake_incidents: int
    active_alerts: int
    incidents_by_category: dict
    recent_incidents: list[IncidentResponse]
