# Disaster Management System - Zimbabwe

Centralised web application for critical incident reporting and disaster management.

## Project Structure

```
disaster-management/
├── backend/          # FastAPI REST API server
├── frontend/         # Public-facing React app (incident reporting & tracking)
└── authority/        # Authority dashboard React app (incident management & alerts)
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Local Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with docs at `http://localhost:8000/docs`.

### 2. Public Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

### 3. Authority Dashboard

```bash
cd authority
npm install
npm run dev
```

Runs at `http://localhost:5174`.

## Default Login Credentials

The backend automatically seeds the following authority accounts on first run:

| Username        | Password      | Role              | Department                |
|-----------------|---------------|-------------------|---------------------------|
| `admin`         | `password123` | Admin             | System                    |
| `police_admin`  | `password123` | Police            | Zimbabwe Republic Police  |
| `fire_admin`    | `password123` | Fire Department   | City Fire Department      |
| `health_admin`  | `password123` | Health            | Ministry of Health        |
| `civil_admin`   | `password123` | Civil Protection  | Civil Protection          |

Login at `http://localhost:5174` using any of the above credentials.
