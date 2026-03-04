# Zimbabwe Disaster Management - Authority Portal

An admin dashboard for authorities to manage disaster incidents, issue emergency alerts, and coordinate response across Zimbabwe.

## Features

- **Dashboard Overview** - Stats grid, category breakdown charts, notifications, and recent incidents map
- **Manage Incidents** - View, verify, update status, flag as fake, or delete incident reports (list and map views)
- **Create Alerts** - Issue emergency alerts with severity levels and target areas
- **Role-Based Access** - Authorities only see incidents relevant to their department (admin sees all)

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

The backend lives inside the public portal repo under `backend/` (or as a separate service):

```bash
cd disaster-management-public/backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The backend runs on **http://localhost:8000** and seeds demo authority accounts on first startup.

### 3. Start the Public Portal

```bash
cd disaster-management-public
npm install
npm run dev
```

Runs on **http://localhost:5173**

### 4. Start the Authority Portal (this project)

```bash
npm install
npm run dev
```

Runs on **http://localhost:5174**

## Test Credentials

The login page at `http://localhost:5174/login` has demo quick-login buttons. You can also use these credentials manually:

| Username       | Role              | Password      |
|----------------|-------------------|---------------|
| `admin`        | Admin             | `password123` |
| `police_admin` | Police            | `password123` |
| `fire_admin`   | Fire Department   | `password123` |
| `health_admin` | Health            | `password123` |
| `civil_admin`  | Civil Protection  | `password123` |

## Related Projects

- **Public Portal**: [disaster-management-public](https://github.com/farai-coder/disaster-management-public) - Runs on `http://localhost:5173`
