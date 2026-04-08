# ✦ Travel Buddy — Full Stack Application

> Connect solo travelers worldwide. Find companions, plan trips, and explore together.

---

## 🗂 Project Structure

```
TravelBuddy/
├── backend/                        ← Node.js / Express API (MVC)
│   ├── config/
│   │   └── db.js                   ← MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js       ← Register, Login, GetMe
│   │   ├── tripController.js       ← Trips CRUD + Join requests + Admin
│   │   └── aiController.js         ← Groq AI chat + plan generation
│   ├── middleware/
│   │   └── authMiddleware.js       ← JWT verification (protect + adminOnly)
│   ├── models/
│   │   ├── userModel.js            ← User SQL queries
│   │   └── tripModel.js            ← Trip + join_request SQL queries
│   ├── routes/
│   │   ├── authRoutes.js           ← /api/auth
│   │   ├── tripRoutes.js           ← /api/trips
│   │   └── aiRoutes.js             ← /api/ai
│   ├── .env.example
│   ├── package.json
│   └── server.js                   ← Entry point — creates tables + seeds data
│
└── frontend/                       ← React SPA (Vite + Tailwind CSS)
    ├── src/
    │   ├── components/
    │   │   ├── TripTable.jsx        ← Trip cards (browse) + data table (admin)
    │   │   ├── TripForm.jsx         ← Create trip form
    │   │   ├── Modal.jsx            ← Reusable overlay dialog
    │   │   ├── SearchBar.jsx        ← Debounced search input
    │   │   ├── StatsBar.jsx         ← Admin stats dashboard cards
    │   │   ├── AISuggestModal.jsx   ← AI chat + plan generator
    │   │   └── MapView.jsx          ← Leaflet route map
    │   ├── context/
    │   │   └── AuthContext.jsx      ← Global auth state (React Context)
    │   ├── hooks/
    │   │   └── useTrips.js          ← Custom hooks for trip state
    │   ├── pages/
    │   │   └── AuthPage.jsx         ← Login / Register page
    │   ├── services/
    │   │   ├── authService.js       ← Auth API calls + axios instance
    │   │   ├── tripService.js       ← Trip API calls
    │   │   └── aiService.js         ← AI API calls
    │   ├── App.jsx                  ← Root component / auth guard / all tabs
    │   ├── main.jsx                 ← React entry point
    │   └── index.css                ← Tailwind + custom styles
    ├── index.html
    ├── vite.config.js               ← Dev server + /api proxy
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- MySQL 8+ running locally
- A [Groq API key](https://console.groq.com) (free)

### 2. Database Setup
```sql
CREATE DATABASE travel_buddy;
```
> Tables are auto-created and seeded when the server starts — no migrations needed.

### 3. Backend Setup
```bash
cd backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and fill in: DB_PASSWORD, GROQ_API_KEY

npm run dev   # Starts on http://localhost:5000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Starts on http://localhost:5173
```

### 5. Open the App
Visit **http://localhost:5173**

---

## 🔑 Demo Credentials

| Role  | Email                      | Password   |
|-------|----------------------------|------------|
| Admin | admin@travelbuddy.com      | Admin@123  |
| User  | priya@example.com          | pass123    |
| User  | rahul@example.com          | pass123    |
| User  | ananya@example.com         | pass123    |

---

## ✨ Features

### 🔐 Authentication
- JWT-based login & registration
- Roles: `admin` and `user`
- Token stored in localStorage, validated on every app load
- Suspended accounts blocked at login

### 🛡️ Admin Dashboard
- Platform statistics (users, trips, requests)
- Full user management: edit, suspend/activate, delete
- Trip moderation: view and remove any trip

### 🌍 User Features
- **Browse** — filter by type, plan tier, and search
- **Post Trip** — full form with tag editor and plan type picker
- **My Trips** — manage your trips; accept/decline join requests
- **My Requests** — track all outgoing join requests
- **AI Assistant** — 4 specialist modes powered by Groq (Llama 3.3 70B)
- **Travel Plan Builder** — one-shot itinerary + cost estimation
- **Route Map** — Leaflet.js interactive map with distance/time/fare

### 🤖 AI Features (Groq)
| Mode             | Description                          |
|------------------|--------------------------------------|
| Companion Matcher| Find compatible travel buddies       |
| Trip Planner     | Day-by-day itinerary creation        |
| Cost Estimator   | Budget breakdown in ₹                |
| Stay & Eat Guide | Hotel & restaurant recommendations   |
| Plan Builder     | Complete trip plan with costs        |

### ✏️ Edit Profile (Feature 1)
- Update name, age, and bio from any page (click avatar in header)
- Change password securely — current password required for verification
- Avatar initials auto-update from the new name in real-time

### 🗺️ Manual Location Search (Feature 2)
- `<LocationSearch>` component uses **Nominatim API** (free, no API key needed)
- Search any city or place worldwide with autocomplete dropdown
- Available in: Map tab, Post Trip form, and AI Plan Builder
- Quick-select preset buttons for popular cities still available

### 🎨 Logo & Branding (Feature 3)
- Custom `travel-icon.png` as browser favicon and mobile home screen icon
- Full `travel-logo.png` in the sticky header (responsive — icon-only on mobile)
- Auth page: icon + brand name on white card, ghost logo watermark in background
- `mix-blend-mode: screen` CSS trick makes black PNG backgrounds transparent

---

## 🏛 Architecture

### Backend — MVC Pattern
```
Request → Route → Middleware (JWT) → Controller → Model (SQL) → Response
```
- **Routes** — URL mapping only
- **Controllers** — Business logic, validation, orchestration
- **Models** — All SQL queries in one place (easy to test/swap)
- **Middleware** — JWT auth runs before protected routes

### Frontend — Service + Hook Pattern
```
Component → Custom Hook (state) → Service (API call) → Express Backend
```
- **Services** — All `axios` calls centralized (`authService`, `tripService`, `aiService`)
- **Hooks** — Data fetching + state (`useBrowseTrips`, `useMyTrips`, `useTripForm`, etc.)
- **Components** — Pure UI, receive data as props
- **Context** — Global auth state via React Context

---

## 🌐 API Endpoints

### Auth
| Method | Path              | Auth     | Description         |
|--------|-------------------|----------|---------------------|
| POST   | /api/auth/register| Public   | Create account      |
| POST   | /api/auth/login   | Public   | Returns JWT         |
| GET    | /api/auth/me      | Protected| Get current user    |

### Trips
| Method | Path                          | Auth     |
|--------|-------------------------------|----------|
| GET    | /api/trips                    | Public   |
| POST   | /api/trips                    | User     |
| GET    | /api/trips/my                 | User     |
| DELETE | /api/trips/:id                | Owner    |
| POST   | /api/trips/:id/join           | User     |
| GET    | /api/trips/:id/requests       | Owner    |
| PATCH  | /api/trips/:id/requests/:rid  | Owner    |
| GET    | /api/trips/requests/mine      | User     |

### Admin
| Method | Path                              | Auth  |
|--------|-----------------------------------|-------|
| GET    | /api/trips/admin/stats            | Admin |
| GET    | /api/trips/admin/users            | Admin |
| PUT    | /api/trips/admin/users/:id        | Admin |
| PATCH  | /api/trips/admin/users/:id/status | Admin |
| DELETE | /api/trips/admin/users/:id        | Admin |

### AI
| Method | Path          | Auth | Description              |
|--------|---------------|------|--------------------------|
| POST   | /api/ai/chat  | User | Multi-turn AI assistant  |
| POST   | /api/ai/plan  | User | Generate travel plan     |

---

## 🛠 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS      |
| Backend   | Node.js, Express.js               |
| Database  | MySQL 8 + mysql2                  |
| Auth      | JWT + bcryptjs                    |
| AI        | Groq SDK (Llama 3.3 70B)          |
| Maps      | Leaflet.js (CDN)                  |
| HTTP      | Axios (with interceptors)         |
