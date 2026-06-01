# Project Defence Guide
## Centralised Disaster Management System for Zimbabwe

*A plain-language write-up of what the system is, how it was built, how it was deployed, the challenges faced, and how to defend it — organised to match the Final Assessment Form (June 2026).*

---

## 1. The Problem (Why this project exists)

In Zimbabwe, when a disaster or emergency happens — a fire, a road accident, a robbery, a disease outbreak, a flood — members of the public often do not know **who to call**, calls go to the **wrong department**, or several departments are needed at once but only one is contacted. There is no single national platform where:

- the public can **report** an incident with its exact location and a photo,
- the **right authorities** are alerted automatically and immediately,
- authorities can **see all incidents on a live map**, manage them, and issue public warnings,
- responders can **report back** what they found on the scene (genuine emergency vs. false alarm).

My system solves this by providing **one centralised web platform** that connects the public and the emergency authorities (Police, Fire Brigade, Health/Ambulance, Civil Protection) in real time.

**One-sentence pitch for the panel:** *"It is a centralised web application that lets any member of the public report a critical incident in seconds, automatically routes it to the correct emergency authorities based on what happened and where, and gives those authorities a live dashboard and map to respond, warn the public, and close the loop."*

---

## 2. What the System Does (Core Features)

The platform is made of **three separate applications** that talk to one shared backend:

### A. Public Portal (`disaster.shopivell.com`)
- **Report an Incident** — choose a category (crime, fire, accident, disease outbreak, cyclone/flood, drought, other), write a description, pin the location on a map (or use GPS), and optionally attach a photo. Can be submitted **anonymously**.
- **Live Map** — see incidents happening around the country in real time.
- **Track an Incident** — follow the status of something you reported (pending → verified → in progress → resolved).
- **View Alerts** — read public safety warnings issued by the authorities.
- **Emergency Numbers** — a built-in directory of Zimbabwe toll-free numbers (Police 995, Ambulance 994, Fire 993, Childline 116, GBV/Musasa, ZESA, ZINWA, etc.).

### B. Authority Dashboard (`admin.disaster.shopivell.com`)
- **Login / Sign-up** for the four authority types.
- **Dashboard** — statistics scoped to that authority (total, pending, verified, in-progress, resolved, fake incidents; active alerts; breakdown by category; recent incidents).
- **Manage Incidents** — view, filter, update status, reassign, and delete incidents relevant to that department.
- **Incident Map** — geographic view of all relevant incidents.
- **Alerts Manager** — create, deactivate, and delete public warnings (with severity: low/medium/high/critical, target area, radius, expiry).
- **Responders & Attendance** — track which responders attended which incident, validate and close reports.
- **Reports / Analytics** — printable summaries aggregated by category, status, and day, with date filtering.
- **Account Settings** — change password.
- **Live notifications** — a bell that updates instantly when a new incident relevant to that department arrives.

### C. Backend API (`api.disaster.shopivell.com`)
The brain of the system — a REST API plus a WebSocket channel for live updates, with a database underneath.

---

## 3. How It Was Built (Step by Step)

This is the chronological story you can tell the panel.

**Step 1 — Requirements & design.** Identified the actors (public reporter, four authority types, responders), the core entities (Incident, Authority, Alert, Notification, Incident Report), and the categories of disaster relevant to Zimbabwe.

**Step 2 — Database design.** Designed the data model (see Section 5) and implemented it with **SQLAlchemy ORM** so the schema is defined in Python code (`models.py`) and the tables are created automatically.

**Step 3 — Backend API.** Built the server with **FastAPI** (Python). Organised the code cleanly into:
- `routers/` — the API endpoints, split by domain: `incidents.py`, `alerts.py`, `authorities.py`.
- `services/` — the business logic: `notification.py` (smart routing), `authority_offices.py` (office directory + distance maths), `events.py` (real-time event bus).
- `schemas.py` — **Pydantic** models that validate every incoming request.
- `models.py`, `database.py` — the database layer.

**Step 4 — Smart routing engine.** Built the standout feature: instead of sending every incident to one fixed department, the system **reads the title and description**, matches **keywords** (e.g. "caught fire", "bleeding", "robbery", "flooding"), and combines that with the category to decide **all** the authorities that should be alerted — and then finds the **nearest physical office** of each using the Haversine distance formula. (Detailed in Section 7.)

**Step 5 — Real-time layer.** Added a **WebSocket** endpoint so that when anything changes (new incident, status update, new alert), the server **broadcasts** the event and every connected dashboard and map updates instantly — no page refresh needed.

**Step 6 — Frontend apps.** Built the public portal and the authority dashboard as two separate **React 19 + Vite** single-page applications. Used **React Router** for navigation, **Axios** for API calls, **Leaflet / React-Leaflet** for the interactive maps, and **Lucide** for icons. A shared `useLiveIncidents` hook subscribes to the WebSocket and auto-reconnects with exponential backoff.

**Step 7 — Seeding & convenience.** On first startup the backend automatically creates four demo authority accounts (police, fire, health, civil protection) so the system is usable immediately, and runs lightweight automatic migrations to add new columns to an existing database without losing data.

**Step 8 — Containerisation & deployment.** Wrote a `Dockerfile` for each app and a `docker-compose.yml` to run all three together behind a reverse proxy with HTTPS (Section 4).

---

## 4. How It Was Deployed

**Local development first.** Each part runs independently:
- Backend: `uvicorn main:app --reload --port 8000` (API docs auto-generated at `/docs`).
- Public frontend: `npm run dev` on port 5173.
- Authority dashboard: `npm run dev` on port 5174.

**Production deployment with Docker.** Every component is packaged into a **Docker container**:
- The **backend** image is built from `python:3.12-slim`, installs dependencies, and runs Uvicorn on port 8000.
- Each **frontend** uses a **multi-stage build**: a Node stage compiles the React app into static files, then those files are served by a tiny **Nginx** image. This keeps the final image small and fast.

`docker-compose.yml` orchestrates all three services and connects them to a **Traefik** reverse proxy (via the `dokploy-network`). Traefik:
- routes each public domain to the right container,
- automatically obtains and renews **HTTPS certificates from Let's Encrypt**,
- **redirects all HTTP traffic to HTTPS**.

The result is three live, secured domains:
| App | Domain |
|-----|--------|
| Public portal | `https://disaster.shopivell.com` |
| Authority dashboard | `https://admin.disaster.shopivell.com` |
| API | `https://api.disaster.shopivell.com` |

The SQLite database and uploaded photos are stored on **Docker volumes**, so data **survives container restarts and re-deploys** (this is also your basic backup/persistence answer).

**One-line deploy story for the panel:** *"Each app is a Docker container; Docker Compose runs them together behind a Traefik reverse proxy that gives free auto-renewing HTTPS, and the database lives on a persistent volume so data is never lost on redeploy."*

---

## 5. System Architecture & Database Design

### Architecture (three-tier)

```
   PUBLIC USERS                      AUTHORITY STAFF
        │                                  │
        ▼                                  ▼
 ┌──────────────┐                 ┌──────────────────┐
 │ Public React │                 │ Authority React  │   (Presentation tier)
 │   Portal     │                 │   Dashboard      │
 └──────┬───────┘                 └────────┬─────────┘
        │   HTTPS (REST) + WebSocket (live)│
        └───────────────┬──────────────────┘
                        ▼
              ┌────────────────────┐
              │  FastAPI Backend   │   (Application / logic tier)
              │  routers + services│
              │  smart routing,    │
              │  WebSocket hub     │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │  SQLite Database    │  (Data tier)
              │  via SQLAlchemy ORM │
              └────────────────────┘
```

### Database tables (entities)

| Table | Purpose | Key fields |
|-------|---------|-----------|
| **incidents** | A reported emergency | title, description, category, status, latitude, longitude, location_name, photo_url, is_anonymous, reporter info, assigned_authority, timestamps |
| **authorities** | An emergency-department account | username, password_hash, name, authority_type, department, is_active |
| **alerts** | A public safety warning | title, message, severity, category, target_area, lat/lon, radius_km, is_active, expires_at |
| **notifications** | In-app alert to a department | message, type, target_authority_type, is_read, links to incident/alert |
| **incident_reports** | Responder feedback after attending | responder_name, authority, outcome, notes, is_false_alarm, is_validated, is_closed |

**Enumerations** keep data consistent: incident categories (crime, fire, accident, disease_outbreak, cyclone_flood, drought, other), statuses (pending, verified, in_progress, resolved, fake), and authority types (police, fire_department, health, civil_protection).

---

## 6. Technology Stack (and why)

| Layer | Technology | Why I chose it |
|-------|-----------|----------------|
| Backend framework | **FastAPI** (Python) | Fast, modern, automatic API documentation, built-in validation |
| Validation | **Pydantic** | Rejects bad input automatically before it reaches the logic |
| Database / ORM | **SQLite + SQLAlchemy** | Zero-config, file-based, perfect for a prototype; ORM keeps schema in code |
| Real-time | **WebSockets** | Push live updates instantly instead of constant polling |
| Auth | **JWT (python-jose) + bcrypt (passlib)** | Industry-standard tokens and one-way password hashing |
| Frontend | **React 19 + Vite** | Component-based, fast dev server, fast production build |
| Maps | **Leaflet + React-Leaflet** | Free, open-source interactive maps (no API key needed) |
| HTTP client | **Axios** | Clean API calls from the browser |
| Deployment | **Docker + Docker Compose + Nginx + Traefik** | Reproducible, containerised, auto-HTTPS, production-ready |

---

## 7. The Innovation: Intelligent Multi-Authority Routing

This is the feature to emphasise for the **Innovation & Creativity (20 marks)** section.

A naïve system maps one category → one department. Real emergencies are messier: *"a head-on collision and the cars caught fire, two people are trapped and bleeding"* is an **accident**, but it actually needs **Police + Fire Brigade + Ambulance** all at once.

My routing engine (`services/notification.py`) does three things:

1. **Category mapping** — every category has a default set of responsible authorities (e.g. fire → Fire Brigade **and** Health).
2. **Keyword intelligence** — it scans the title and description for **dozens of keywords and phrases** ("burning", "explosion", "bleeding", "trapped", "robbery", "flooding", "collapse"…) and adds any extra authority those words imply, even if the reporter chose the wrong category. Multi-word phrases are matched as substrings; single words use **word-boundary regex** so "fire" doesn't match "firefighter" incorrectly.
3. **Severity escalation** — an accident described with severe wording (fire, trapped, explosion) automatically escalates to bring **all three** of Police, Ambulance and Fire on scene.

Then `services/authority_offices.py` takes the incident's GPS coordinates and uses the **Haversine great-circle formula** to find the **nearest actual office** (from a directory of real Zimbabwean police stations, fire brigades, hospitals and Civil Protection offices) for each responsible authority — so the dispatcher *closest to the scene* is the one paged.

**Education 5.0 link (the form asks for this):**
- **Innovation & Industrialisation** — an original, locally-built emergency-tech solution tailored to Zimbabwe's authorities and emergency numbers.
- **Community outreach / problem-solving** — directly addresses a real national public-safety gap.
- **Research** — applies geospatial computation (Haversine) and keyword-based classification to a practical domain.

---

## 8. Mapping to the Assessment Form (Your Defence Cheat-Sheet)

### ① Technical Development & Implementation — 25 marks
*"Does it meet functional requirements? Perform intended tasks? Free from errors?"*
- ✅ Full incident lifecycle: report → auto-route → manage → respond → resolve/flag fake.
- ✅ Clean layered architecture (routers / services / schemas / models).
- ✅ Real database with 5 related tables and proper relationships.
- ✅ Complete CRUD on incidents, alerts, reports, authorities.
- ✅ Smart routing algorithm + geospatial nearest-office computation.
- ✅ Real-time WebSocket updates across all clients.
- **Say:** *"The system implements every functional requirement end-to-end, organised into a clean three-tier architecture with separated concerns."*

### ② User Interface, Usability & Input Validation — 10 marks
- ✅ Two purpose-built, intuitive React interfaces (public vs. authority) with maps, icons and clear navigation.
- ✅ **Input validation on every layer**: Pydantic schemas enforce minimum lengths, latitude ∈ [-90, 90], longitude ∈ [-180, 180], allowed severity values via regex, allowed outcomes, password minimum length — invalid data is rejected with a clear error, never crashing the server.
- ✅ In-app toasts and live notifications guide the user.
- ✅ Auto-generated interactive API documentation at `/docs` (this is your "help and documentation").
- **Say:** *"Validation happens at the API boundary with Pydantic, so the server cannot be crashed by malformed input — it returns a clear 422 error instead."*

### ③ Testing & Evaluation — 20 marks
- ✅ **Error handling**: every endpoint guards against missing records (returns 404), bad input (422), and wrong credentials (401). The WebSocket and event bus are wrapped in try/except and are "best-effort, never raises" so a failed broadcast can't take down a request.
- ✅ **Fault tolerance**: the frontend WebSocket **auto-reconnects with exponential backoff** if the connection drops; the backend `restart: unless-stopped` policy auto-restarts a crashed container.
- ✅ **Response time / scalability**: FastAPI is asynchronous; queries are indexed on primary keys and incident_id; the frontend is served as pre-built static files via Nginx (very fast).
- ✅ Tested manually across all user journeys; the `/docs` interface allows live endpoint testing.
- **Be honest about limits:** *"It uses SQLite, which is excellent for this prototype scale; for very high concurrent national load the next step would be PostgreSQL — the ORM means that's a one-line change."*

### ④ System Security — 10 marks
- ✅ **Authentication**: username/password login issuing **JWT tokens** that expire after 24 hours.
- ✅ **Passwords are never stored in plain text** — they are hashed with **bcrypt** (one-way, salted).
- ✅ **Authorization / data scoping**: each authority only sees incidents relevant to its type.
- ✅ **Input sanitisation** via Pydantic prevents malformed/oversized data; the ORM uses parameterised queries which **prevent SQL injection**.
- ✅ **HTTPS everywhere** with auto-renewing Let's Encrypt certificates (encryption in transit); HTTP is force-redirected to HTTPS.
- ✅ **Backup/recovery**: database and uploads live on **persistent Docker volumes** that survive restarts and redeploys.
- **Honest hardening note (shows maturity):** *"For production I would move the JWT secret key into an environment variable, tighten CORS from the permissive demo setting to the known domains, and enforce auth middleware on the management endpoints — the structure is already in place for all three."*

### ⑤ Innovation & Creativity — 20 marks
- ✅ Intelligent **multi-authority keyword + severity routing** (Section 7) — beyond a simple lookup table.
- ✅ **Geospatial nearest-office dispatch** using the Haversine formula.
- ✅ **Real-time** collaborative dashboards via WebSockets.
- ✅ Localised for Zimbabwe (real emergency numbers, real cities and stations).
- ✅ Clear **Education 5.0** alignment (innovation, industrialisation, community outreach, research).

### ⑥ Documentation & Report Quality — 10 marks
- ✅ README with setup instructions, this defence guide, auto-generated API docs, clean commit history, and a Chapter 4 generator script.

### ⑦ Presentation & Demonstration — 5 marks
- See the live demo script in Section 10.

---

## 9. Challenges Faced (and How I Solved Them)

Panels love this question. Have these ready:

1. **Routing to the wrong/only one department.**
   *Problem:* A single category can't capture a complex emergency. *Solution:* Built the keyword + severity escalation engine that returns **multiple** authorities from the incident text.

2. **Real-time updates without hammering the server.**
   *Problem:* Constantly polling the API for new incidents is wasteful and slow. *Solution:* Implemented a **WebSocket event bus** so the server pushes changes once and all clients update instantly.

3. **Sending events from synchronous code.**
   *Problem:* The REST endpoints are synchronous, but WebSocket broadcasting is asynchronous. *Solution:* A small event-bus indirection (`events.py`) plus `run_coroutine_threadsafe` schedules the broadcast safely onto the running event loop, with a decoupled publisher so there are no circular imports.

4. **Evolving the database without losing data.**
   *Problem:* I needed to add new columns (validation/close flags) after data already existed. *Solution:* Wrote **lightweight automatic migrations** that run on startup and add missing columns only if absent.

5. **Finding the *nearest* responder, not just *a* responder.**
   *Problem:* Distance on a globe isn't straight-line. *Solution:* Implemented the **Haversine great-circle formula** over a directory of real Zimbabwean offices.

6. **Deploying three apps under HTTPS cleanly.**
   *Problem:* Three apps, one server, certificates, routing. *Solution:* **Docker Compose + Traefik** with automatic Let's Encrypt certificates and per-domain routing labels.

7. **CORS and separate frontends.**
   *Problem:* Browsers block cross-origin API calls. *Solution:* Configured CORS middleware and injected the API/WebSocket URLs at build time via Vite build args, so the same code works locally and in production.

8. **Frontend dependency conflicts on React 19.**
   *Problem:* Some packages lagged behind React 19. *Solution:* Installed with `--legacy-peer-deps` in the Docker build to resolve peer-dependency conflicts cleanly.

---

## 10. Live Demo Script (for the 5-mark Presentation)

Run this exact sequence — it shows the whole system in 3–4 minutes:

1. **Open the public portal.** Show the home page and emergency numbers directory.
2. **Report an incident** — pick "Accident", type *"Head-on collision on Seke Road, a car caught fire and someone is bleeding"*, drop a pin, attach a photo, submit.
3. **Switch to the authority dashboard** (already logged in as Police). Point out that the **bell notification pops up instantly** (this is the WebSocket) — and that **Fire and Health also received it** because of the keywords "fire" and "bleeding". *This is the innovation moment.*
4. **Open the dashboard map** — the new incident appears live.
5. **Update its status** to "In Progress" — show it change.
6. **Issue a public alert** ("Avoid Seke Road — accident and fire") and show it appear on the **public View Alerts** page.
7. **File a responder report** marking the outcome, then **validate and close** it — show the incident move to Resolved.
8. **Open Reports/Analytics** — show the aggregated counts by category/status/day.
9. Mention the live URLs and that it's **fully deployed under HTTPS**.

---

## 11. Likely Panel Questions — Quick Answers

- **"Why SQLite and not MySQL/Postgres?"** Right tool for a prototype: zero-config, file-based, fast. The SQLAlchemy ORM means switching to PostgreSQL for national scale is a configuration change, not a rewrite.
- **"How is it secure?"** JWT auth, bcrypt-hashed passwords, parameterised ORM queries (no SQL injection), HTTPS in transit, per-authority data scoping.
- **"What happens on bad input?"** Pydantic rejects it at the boundary with a 422 — the server never crashes.
- **"What if the server restarts?"** Data is on Docker volumes; the container auto-restarts; clients auto-reconnect.
- **"How does it know which authority to alert?"** Category mapping + keyword detection + severity escalation, then nearest-office by Haversine distance.
- **"Is it real-time?"** Yes — WebSocket broadcasting, no polling.
- **"What would you improve next?"** Real SMS gateway (Twilio/Africa's Talking — currently simulated), PostgreSQL, env-var secrets, tighter CORS, automated tests, and an AI image classifier to auto-verify photos (the hook for that already exists).
- **"What's innovative about it?"** The multi-authority intelligent routing and geospatial nearest-office dispatch — most reporting systems just file a ticket; mine *decides who responds and from where*.

---

## 12. One-Paragraph Summary (memorise this)

*"This is a centralised disaster management web platform for Zimbabwe with three parts — a public reporting portal, an authority command dashboard, and a FastAPI backend — connected in real time over WebSockets. The public report incidents with location and photos; an intelligent routing engine reads the report, uses keyword and severity analysis plus category mapping to alert every relevant authority (Police, Fire, Health, Civil Protection), and uses the Haversine formula to page the nearest office. Authorities manage incidents on a live map, issue public alerts, and close the loop with responder reports. It's secured with JWT and bcrypt, validated with Pydantic, and deployed as Docker containers behind a Traefik reverse proxy with automatic HTTPS."*
