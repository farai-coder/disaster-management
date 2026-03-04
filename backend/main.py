import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base, SessionLocal
from models import Authority, AuthorityType
from passlib.context import CryptContext
from routers import incidents, alerts, authorities


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_default_authorities():
    """Seed default authority accounts for demo."""
    db = SessionLocal()
    try:
        if db.query(Authority).count() > 0:
            return

        defaults = [
            {"username": "police_admin", "name": "ZRP Command Center", "authority_type": AuthorityType.POLICE, "department": "Zimbabwe Republic Police"},
            {"username": "fire_admin", "name": "Fire & Rescue HQ", "authority_type": AuthorityType.FIRE_DEPARTMENT, "department": "City Fire Department"},
            {"username": "health_admin", "name": "MoH Command Center", "authority_type": AuthorityType.HEALTH, "department": "Ministry of Health"},
            {"username": "civil_admin", "name": "Civil Protection Unit", "authority_type": AuthorityType.CIVIL_PROTECTION, "department": "Civil Protection"},
            {"username": "admin", "name": "System Administrator", "authority_type": AuthorityType.ADMIN, "department": "System"},
        ]
        for auth_data in defaults:
            authority = Authority(
                username=auth_data["username"],
                password_hash=pwd_context.hash("password123"),
                name=auth_data["name"],
                authority_type=auth_data["authority_type"],
                department=auth_data["department"],
            )
            db.add(authority)
        db.commit()
        print("Default authority accounts seeded.")
    finally:
        db.close()


# --- WebSocket Manager ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_default_authorities()
    yield


app = FastAPI(
    title="Disaster Management System - Zimbabwe",
    description="Centralised Web Application for Critical Incident Reporting and Disaster Management",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving photos
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(authorities.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await ws_manager.broadcast(message)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "message": "Disaster Management System API",
        "docs": "/docs",
        "version": "1.0.0",
    }


# Make ws_manager accessible from routers
app.state.ws_manager = ws_manager
