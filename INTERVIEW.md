# 🎯 Travel Buddy — Interview Preparation Guide

> Use this guide to confidently explain every part of the project in technical interviews.
> Each section covers **what it is**, **why we did it**, and **how to explain it**.

---

## 📌 Table of Contents

1. [Project Summary (30-second pitch)](#1-project-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Backend Deep Dive — MVC Pattern](#3-backend-mvc-pattern)
4. [Database Design — MySQL Schema](#4-database-design)
5. [Authentication — JWT + bcrypt](#5-authentication)
6. [Frontend Deep Dive — Component Architecture](#6-frontend-architecture)
7. [Custom Hooks Pattern](#7-custom-hooks)
8. [Service Layer Pattern](#8-service-layer)
9. [AI Integration — Groq API](#9-ai-integration)
10. [Key React Concepts Used](#10-key-react-concepts)
11. [Common Interview Questions & Answers](#11-interview-qa)

---

## 1. Project Summary

**"In 30 seconds, tell me about your project."**

> "Travel Buddy is a full-stack web application that connects solo travelers who want to find companions for their trips. Users can post trip plans, browse others' trips, send join requests, and use an AI assistant powered by Groq to plan itineraries and estimate costs. It has role-based access control — regular users manage their own trips, while admins can manage all users and content. The backend is a REST API built with Express and MySQL following MVC architecture, and the frontend is a React SPA using Vite and Tailwind CSS."

---

## 2. Architecture Overview

```
Browser (React SPA)
       │
       │  HTTP requests with JWT in Authorization header
       ▼
Express REST API (Node.js)
       │
       ├─ Route Handler      → URL + HTTP method mapping only
       ├─ Middleware (JWT)   → Authentication gate
       ├─ Controller         → Business logic + validation
       ├─ Model              → SQL queries only
       ▼
MySQL Database
```

**Why this separation?**
- Each layer has **one responsibility** (Single Responsibility Principle)
- Easy to **test each layer independently**
- Easy to **swap layers** (e.g., switch from MySQL to PostgreSQL by only changing Models)

---

## 3. Backend MVC Pattern

### What is MVC?
| Layer      | File                       | Responsibility                            |
|------------|----------------------------|-------------------------------------------|
| Model      | `models/userModel.js`      | All SQL queries — nothing else            |
| View       | *(JSON responses)*         | We don't have HTML views; React is the V  |
| Controller | `controllers/authController.js` | Orchestrate: validate → call model → respond |
| Route      | `routes/authRoutes.js`     | Map URL + method to controller function   |

### How a request flows:
```
POST /api/auth/login
  → authRoutes.js        (maps to login controller)
  → authController.js    (validates email/password, calls model)
  → userModel.js         (findByEmail SQL query)
  → authController.js    (compares hash, signs JWT)
  → Response: { token, user }
```

### Interview explanation:
> "I used MVC to separate concerns. The Routes just define URL patterns. Controllers have all the business logic — they validate input, call models, and build responses. Models contain all SQL queries and nothing else. This makes the code easy to read, test, and maintain. If I need to change a query, I only touch the model. If I need to change validation logic, I only touch the controller."

---

## 4. Database Design

### Schema Overview:
```sql
users
  id, name, email, password(hashed), role, age, bio,
  status, avatar, color, trips_count, created_at

trips
  id, user_id(FK→users), destination, country, dates,
  duration, spots, total_spots, trip_type, plan_type,
  description, tags(JSON), budget, gradient, req_count, created_at

join_requests
  id, trip_id(FK→trips), requester_id(FK→users),
  status(pending/accepted/declined), created_at
  UNIQUE(trip_id, requester_id)   ← prevents duplicate requests
```

### Key design decisions:
1. **Cascading deletes** — `ON DELETE CASCADE` on FKs means deleting a user auto-deletes their trips and requests. No orphaned data.
2. **JSON column for tags** — Tags are stored as a JSON array string. Flexible — no need for a separate tags table for this scale.
3. **UNIQUE constraint** on `join_requests(trip_id, requester_id)` — Database-level protection against duplicate requests (even if the app-level check fails).
4. **trips_count denormalization** — We store `trips_count` on users for fast stat display, rather than running `COUNT(*)` every time.

### Interview explanation:
> "I used three tables with proper foreign keys and cascade deletes. For tags, I stored them as a JSON array because tags don't need to be queried individually — they're always read and written together with the trip. The UNIQUE constraint on join_requests is a database-level guard that prevents duplicate requests even under race conditions."

---

## 5. Authentication

### Flow:
```
Register:
  1. Check email not taken
  2. bcrypt.hash(password, 10) — 10 salt rounds
  3. Store hashed password
  4. Return JWT signed with JWT_SECRET

Login:
  1. Find user by email
  2. bcrypt.compare(submitted, storedHash)
  3. Check status !== 'suspended'
  4. Return JWT { id, role } payload, 7d expiry

Protected request:
  1. Extract Bearer token from Authorization header
  2. jwt.verify(token, JWT_SECRET) → decoded { id, role }
  3. Fetch fresh user from DB (in case role changed)
  4. Attach to req.user → downstream controllers use it
```

### Why JWT over sessions?
- **Stateless** — server doesn't store sessions; scales horizontally
- **Self-contained** — token carries user ID and role
- **Works across domains** — no cookie issues

### Why bcrypt?
- bcrypt is slow **by design** — it uses work factor (10 rounds = 2^10 iterations)
- Makes brute-force attacks extremely slow
- Each hash is unique even for the same password (built-in salt)

### Interview answer:
> "I used JWT for stateless authentication. On login, we verify the password using bcrypt, which is a one-way hashing algorithm designed to be slow to prevent brute-force attacks. We then sign a JWT containing the user's ID and role. On every protected request, middleware verifies the token and attaches fresh user data to the request object so controllers always have the latest role and status."

---

## 6. Frontend Architecture

### Component Hierarchy:
```
App.jsx                   ← Auth guard, root layout, toast
  ├─ AuthPage             ← Login/Register
  ├─ AdminShell           ← Admin tab container
  │    ├─ AdminOverview   ← Stats + recent trips table
  │    ├─ AdminUsers      ← User CRUD table + Edit modal
  │    └─ AdminTrips      ← Trip moderation table
  └─ UserShell            ← User tab container
       ├─ BrowseTab       ← Trip card grid + detail panel
       ├─ PostTripTab     ← Create trip form
       ├─ MyTripsTab      ← Own trips + join request management
       ├─ MyRequestsTab   ← Outgoing requests tracker
       ├─ AISuggestModal  ← AI chat + plan generator
       └─ MapView         ← Leaflet route map
```

### Prop flow (unidirectional data):
```
App (state) → UserShell → BrowseTab → TripTable (pure display)
                              ↑
                         useBrowseTrips (hook fetches & manages data)
```

---

## 7. Custom Hooks

**Why custom hooks?**
> "Custom hooks extract data-fetching and state logic out of components. Components should focus on rendering UI. The `useBrowseTrips` hook manages the API call, loading state, and error handling. The component just calls the hook and gets back `{ trips, loading }` — it doesn't care how that data was fetched."

### Key hooks:

```js
// useBrowseTrips — re-fetches when filters change
const { trips, loading } = useBrowseTrips({ type, plan, q });

// useTripForm — manages all form state + submission
const { form, setField, submit, loading, error } = useTripForm(onSuccess);

// useJoinTrip — tracks which trips the user has requested to join
const { joined, joinTrip, isJoining } = useJoinTrip();

// useAdminData — all admin data + mutations with optimistic updates
const { users, updateUser, removeUser } = useAdminData();
```

### Optimistic updates in `useAdminData`:
```js
const removeUser = async (id) => {
  const snapshot = [...users];      // 1. Save current state
  setUsers(prev => prev.filter(u => u.id !== id)); // 2. Update UI immediately
  try {
    await adminDeleteUser(id);       // 3. Confirm with server
  } catch {
    setUsers(snapshot);              // 4. Roll back on failure
  }
};
```
> "Optimistic updates make the UI feel instant. We update the UI immediately and confirm with the server in the background. If the server fails, we roll back to the previous state."

---

## 8. Service Layer

**Why a service layer?**
> "All Axios calls are centralized in service files. Components and hooks never write API URLs directly. This means if the API base URL changes, I update it in one place. The Axios interceptor in `authService.js` automatically attaches the JWT to every request and auto-logs out the user if the server returns 401."

```js
// authService.js — one interceptor handles auth for all services
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on token expiry
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("tb_token");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
```

---

## 9. AI Integration

**What is Groq?**
> "Groq provides extremely fast inference for open-source LLMs. I used the `llama-3.3-70b-versatile` model via Groq's API. It's much faster than other providers for interactive chat — responses come back in under 2 seconds typically."

**How it works:**
```
User types message
  → Frontend calls POST /api/ai/chat
  → aiController.js selects system prompt based on mode
  → Sends full conversation history to Groq API
  → Returns text response
  → Frontend appends to message list
```

**Why send full history each time?**
> "LLMs are stateless — they have no memory between calls. To maintain conversation context, we send the entire message history on every request. The `messages` array grows as the conversation continues."

**Four specialist modes:**
| Mode             | System Prompt Focus                         |
|------------------|---------------------------------------------|
| Companion Matcher| Finding compatible travel buddies           |
| Trip Planner     | Day-by-day itinerary creation               |
| Cost Estimator   | Budget breakdown in Indian Rupees           |
| Stay & Eat Guide | Hotels and restaurant recommendations       |

---

## 10. Key React Concepts Used

| Concept          | Where used                        | Why                               |
|------------------|-----------------------------------|-----------------------------------|
| `useState`       | All components                    | Local UI state                    |
| `useEffect`      | Hooks, MapView                    | Side effects (data fetch, Leaflet)|
| `useCallback`    | `useBrowseTrips`                  | Prevent unnecessary re-fetches    |
| `useContext`     | `useAuth()`                       | Global auth state without prop drilling |
| `useRef`         | Chat scroll, Leaflet map instance | DOM access, value without re-render |
| Context API      | `AuthContext`                     | Share auth state across component tree |
| Custom Hooks     | All data fetching                 | Separate logic from UI            |
| Conditional render | `user.role === "admin"`         | Role-based UI switching           |
| Controlled inputs | All forms                        | React owns form state             |

---

## 11. Interview Q&A

**Q: How do you prevent unauthorized users from accessing admin routes?**
> "Two layers of protection. On the backend, the `adminOnly` middleware runs before any admin controller and verifies both the JWT and that `user.role === 'admin'`. On the frontend, the `user.role === 'admin'` check in `App.jsx` controls which UI is rendered — but this is just UX, not security. Security lives on the server."

**Q: What happens when a JWT expires?**
> "The axios response interceptor in `authService.js` catches any 401 response from the server. It clears the token from localStorage and calls `window.location.reload()`. The `AuthContext` then finds no token and renders the login page. On the backend, `jwt.verify()` throws a `TokenExpiredError` which we catch and return a clear error message."

**Q: How do you handle CORS?**
> "The Express server uses the `cors` package configured to only allow requests from the frontend's origin (`http://localhost:5173`). In development, Vite's proxy forwards `/api/*` requests to Express — so from the browser's perspective, there's no cross-origin request at all. In production, you'd set `CLIENT_URL` to the deployed frontend URL."

**Q: Why did you use MySQL instead of MongoDB?**
> "Trip data has clear relational structure — users own trips, trips have join requests from users. SQL lets me enforce these relationships with foreign keys and CASCADE deletes. I also needed aggregate queries for admin stats (`COUNT`, `SUM`), which are natural in SQL. For a document-oriented use case like user-generated content with highly variable schema, MongoDB would make more sense."

**Q: How does the debounced search work?**
> "The `SearchBar` component maintains local state for the input value. A `useEffect` with a 350ms `setTimeout` fires onChange only after the user stops typing. Each keystroke cancels the previous timer via the cleanup function. This means we only send an API request after 350ms of inactivity rather than on every single keypress — much better UX and saves API calls."

**Q: What is an Axios interceptor and why did you use one?**
> "Interceptors are middleware for HTTP calls. The request interceptor runs before every Axios call and adds the Authorization header automatically — without it, every service function would need to manually add the token. The response interceptor catches global errors, like expired tokens (401), and handles them in one place instead of every individual API call."

**Q: How does `useCallback` prevent unnecessary re-fetches in `useBrowseTrips`?**
> "`useBrowseTrips` wraps the `load` function in `useCallback` with `JSON.stringify(filters)` as its dependency. Without `useCallback`, a new function object would be created on every render, causing the `useEffect` to fire endlessly. With `useCallback`, the function only changes when the filters actually change — preventing infinite fetch loops."

**Q: How do optimistic updates work?**
> "In `useAdminData`, when an admin deletes a user, we immediately remove them from the local `users` array so the UI updates instantly — that's the optimistic part. Then we await the actual API call. If it succeeds, nothing more is needed. If it fails (network error, server error), we restore the `snapshot` we saved before the update. This gives a fast, responsive UI while maintaining correctness."

**Q: Why did you store tags as JSON in MySQL instead of a separate table?**
> "Tags are always read and written together with a trip — we never need to query by tag alone ('find all photography trips'). A separate tags table with a join would add complexity with no benefit. JSON storage is simpler and the `JSON.parse` cost is negligible. If we needed tag-based filtering in the future, we'd add a full-text index or migrate to a separate table."

---

## 💡 Things to Highlight in Interviews

1. **MVC pattern** — shows understanding of software architecture
2. **JWT + bcrypt** — demonstrates security awareness
3. **Optimistic updates** — shows advanced React thinking
4. **Custom hooks** — shows understanding of separation of concerns
5. **Axios interceptors** — shows DRY principle in API handling
6. **Database cascade deletes** — shows data integrity awareness
7. **Debounced search** — shows UX and performance awareness
8. **Groq AI integration** — shows ability to work with external APIs
9. **Role-based access control** — both frontend and backend
10. **Auto-seeding** — production-ready dev experience

---

## 12. Feature 3 — Logo & UI Enhancement

### What was implemented
- **Browser favicon** — `travel-icon.png` now shows in the browser tab, bookmarks, and iPhone home screen (set via `<link rel="icon">` in `index.html`)
- **Header logo** — responsive: full `travel-logo.png` on tablet+, circular `travel-icon.png` on mobile
- **Auth page** — circular icon + styled brand name on the white card; large ghost logo watermark behind the card

### Key technique — `mix-blend-mode: screen`
> Both PNG images have a **black background** (not transparent). Instead of re-exporting them, we use CSS `mix-blend-mode: screen` — in screen blending, pure black (rgb 0,0,0) becomes mathematically transparent. Colored pixels (orange hiker, blue background, grey text) render normally. This is a common frontend trick for placing dark-background images on dark-background containers.

```css
header img[src*="travel-logo"] {
  mix-blend-mode: screen;   /* black bg disappears into dark green header */
  filter: brightness(1.15); /* compensate for blend darkening colours slightly */
}
```

### Files changed
| File | What changed |
|------|-------------|
| `frontend/index.html` | `<link rel="icon">` points to `travel-icon.png` |
| `frontend/public/` | Added `travel-logo.png` + `travel-icon.png` (served as static assets by Vite) |
| `frontend/src/App.jsx` | Header: `<img>` tags replace the old `✦ Travel Buddy` text logo |
| `frontend/src/pages/AuthPage.jsx` | Card: icon + text; Background: ghost logo watermark |
| `frontend/src/index.css` | `mix-blend-mode: screen` + crisp rendering for logo images |

### Why put images in `public/` not `src/assets/`?
> Files in `public/` are served as-is at the root URL (`/travel-logo.png`). This makes them usable anywhere — including in plain HTML (`<link rel="icon" href="/travel-icon.png">`). Files in `src/assets/` go through Vite's bundler and get hashed filenames (`travel-logo.a3f4c2.png`) which can't be referenced from `index.html` before the build runs.

---

## 13. Feature 1 — Edit User Profile (added in this session)

### API Endpoints Added
| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/auth/profile` | Update name, age, bio (own account) |
| `PUT` | `/api/auth/password` | Change password (requires current password) |

### Security design decisions
1. **Email is read-only** — email is the login identifier; changing it mid-session could break authentication and session validation
2. **Password change requires current password** — uses `bcrypt.compare(currentPassword, storedHash)` before allowing the change. This means even if someone gets access to an unlocked device, they can't silently change the password
3. **Avatar auto-updates** — avatar initials are derived from the name in the controller: `name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()`. No separate field needed
4. **Global state refresh** — after a successful update, `setUser(updatedUser)` updates React Context AND `localStorage.setItem("tb_user", ...)` so the header reflects the new name/avatar immediately AND persists across page reloads

### Interview answer for "How does the profile update propagate to the UI?"
> "The `PUT /api/auth/profile` endpoint returns the full updated user object. In `EditProfileModal`, we call `setUser(updatedUser)` — `setUser` comes from `AuthContext` and updates the global React state. Because the `Header` component reads `user.name` and `user.avatar` from context, it re-renders instantly. We also persist to `localStorage` so the next page reload starts with the updated data instead of showing stale info."

---

## 14. Feature 2 — Manual Location Search (added in this session)

### What was implemented
A reusable `<LocationSearch>` component using the **Nominatim API** (OpenStreetMap's free geocoding service — no API key needed).

### How geocoding works
```
User types "Bud" → 500ms debounce → GET nominatim.openstreetmap.org/search?q=Bud&format=json
→ Returns: Budapest, Budapest city, Budaörs...
→ Dropdown shows with city, country, and full address
→ User clicks → onSelect({ name, city, country, lat, lng }) fires
→ Parent (MapView / TripForm / AISuggestModal) receives coordinates
```

### Key implementation detail — `mousedown` vs `click`
```jsx
// ❌ Wrong: input blur fires before 'click', closing dropdown before selection registers
onBlur={() => setOpen(false)}  // closes dropdown
onClick={() => handleSelect(loc)} // never fires

// ✅ Correct: mousedown fires BEFORE blur
onMouseDown={(e) => {
  e.preventDefault();   // prevent the blur event entirely
  handleSelect(loc);    // selection registers first
}}
```

### Where LocationSearch is used
| Component | Usage |
|-----------|-------|
| `MapView.jsx` | Both origin and destination — any city worldwide, plus preset shortcuts |
| `TripForm.jsx` | Optional search above the destination/country fields — auto-fills both |
| `AISuggestModal.jsx` | Plan Builder destination — shows selected city chip with clear button |

### Interview answer for "Why Nominatim instead of Google Maps?"
> "Nominatim is OpenStreetMap's geocoding API — completely free with no API key required, which keeps the project simple and cost-zero. The trade-off is rate limits (1 request/second) which is why we debounce at 500ms — we never fire more than 2 requests per second. For a production app with higher traffic, I'd use a paid service like Google Places API or Mapbox Geocoding."
