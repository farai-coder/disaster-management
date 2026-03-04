# Zimbabwe Disaster Management - Public Portal

A public-facing web application for reporting critical incidents, viewing live incident maps, receiving emergency alerts, and tracking report statuses across Zimbabwe.

## Features

- **Report Incidents** - Submit disaster reports with photos, geolocation, and AI-powered image classification
- **Live Map** - Interactive map showing all reported incidents with category/status filters
- **Emergency Alerts** - View active alerts issued by authorities with severity levels
- **Track Reports** - Track the status of submitted incident reports by ID
- **Anonymous Reporting** - Option to submit reports anonymously

## Tech Stack

- React 19
- Vite
- React Router v7
- Leaflet / React-Leaflet
- Axios
- Lucide React Icons

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.9+)

### 1. Clone the repositories

```bash
git clone git@github.com:farai-coder/disaster-management-public.git
git clone git@github.com:farai-coder/disaster-management-authority.git
```

### 2. Start the backend

The backend lives inside this repo under the `backend/` directory (or as a separate service). If running from the full project:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The backend runs on **http://localhost:8000** and seeds demo authority accounts on first startup.

### 3. Start the Public Portal (this project)

```bash
npm install
npm run dev
```

Runs on **http://localhost:5173**

### 4. Start the Authority Portal

```bash
cd ../disaster-management-authority
npm install
npm run dev
```

Runs on **http://localhost:5174**

## Test Credentials (Authority Portal)

The authority portal at `http://localhost:5174/login` has demo quick-login buttons. You can also use these credentials manually:

| Username       | Role              | Password      |
|----------------|-------------------|---------------|
| `admin`        | Admin             | `password123` |
| `police_admin` | Police            | `password123` |
| `fire_admin`   | Fire Department   | `password123` |
| `health_admin` | Health            | `password123` |
| `civil_admin`  | Civil Protection  | `password123` |

## Related Projects

- **Authority Portal**: [disaster-management-authority](https://github.com/farai-coder/disaster-management-authority) - Runs on `http://localhost:5174`
