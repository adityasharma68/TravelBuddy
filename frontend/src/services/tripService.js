// src/services/tripService.js
// ─────────────────────────────────────────────────────────────────────────────
//  Trip Service — All API calls for trips and join requests
// ─────────────────────────────────────────────────────────────────────────────

import { api } from "./authService";

// ── Trips ──────────────────────────────────────────────────────────────────────

/** Fetch all trips — supports optional filters: { type, plan, q } */
export const fetchTrips      = (params = {}) => api.get("/trips", { params });

/** Fetch only the current user's posted trips */
export const fetchMyTrips    = ()            => api.get("/trips/my");

/** Fetch a single trip by ID */
export const fetchTripById   = (id)          => api.get(`/trips/${id}`);

/** Create a new trip */
export const createTrip      = (data)        => api.post("/trips", data);

/** Update an existing trip (owner or admin) */
export const updateTrip      = (id, data)    => api.put(`/trips/${id}`, data);

/** Delete a trip (owner or admin) */
export const deleteTrip      = (id)          => api.delete(`/trips/${id}`);

// ── Join Requests ──────────────────────────────────────────────────────────────

/** Send a join request to a trip */
export const sendJoinRequest      = (tripId)              => api.post(`/trips/${tripId}/join`);

/** Trip owner: get all incoming requests for their trip */
export const fetchJoinRequests    = (tripId)              => api.get(`/trips/${tripId}/requests`);

/** Trip owner: accept or decline a specific request */
export const updateRequestStatus  = (tripId, reqId, status) =>
  api.patch(`/trips/${tripId}/requests/${reqId}`, { status });

/** Current user: see all their outgoing join requests */
export const fetchMyRequests      = ()                    => api.get("/trips/requests/mine");

// ── Admin — User Management ────────────────────────────────────────────────────

export const adminFetchAllUsers   = ()         => api.get("/trips/admin/users");
export const adminFetchStats      = ()         => api.get("/trips/admin/stats");
export const adminUpdateUser      = (id, data) => api.put(`/trips/admin/users/${id}`, data);
export const adminToggleStatus    = (id, status) =>
  api.patch(`/trips/admin/users/${id}/status`, { status });
export const adminDeleteUser      = (id)       => api.delete(`/trips/admin/users/${id}`);
