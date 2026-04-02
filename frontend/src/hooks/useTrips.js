// src/hooks/useTrips.js
// ─────────────────────────────────────────────────────────────────────────────
//  useTrips — Custom hook for trip state management
//
//  Why a custom hook?
//    Keeps data-fetching logic OUT of page components.
//    The component just calls the hook and gets back { trips, loading, ... }.
//    Easy to reuse across multiple pages.
//
//  Follows the same pattern as the useTasks hook from TaskFlow.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  fetchTrips,
  fetchMyTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  sendJoinRequest,
  fetchJoinRequests,
  updateRequestStatus,
  fetchMyRequests,
} from "../services/tripService";

// ── useBrowseTrips ─────────────────────────────────────────────────────────────
// Used by the Browse tab — supports filter + search with re-fetch on change.
export function useBrowseTrips(filters) {
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchTrips(filters);
      setTrips(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // Re-run when filters object changes

  useEffect(() => { load(); }, [load]);

  return { trips, loading, error, refetch: load };
}

// ── useMyTrips ─────────────────────────────────────────────────────────────────
// Used by the My Trips tab — only the current user's posted trips.
export function useMyTrips() {
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchMyTrips();
      setTrips(data);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Optimistic delete ─────────────────────────────────────────────────────
  // Remove from local state immediately; API call runs in background.
  const removeTrip = async (id) => {
    setTrips(prev => prev.filter(t => t.id !== id)); // Optimistic
    await deleteTrip(id);
  };

  return { trips, loading, refetch: load, removeTrip };
}

// ── useTripForm ────────────────────────────────────────────────────────────────
// Manages the create/edit trip form state + submission.
export function useTripForm(onSuccess) {
  const [form, setForm]       = useState({
    destination: "", country: "", dates: "", duration: "",
    spots: "1", trip_type: "Adventure", plan_type: "moderate",
    description: "", tags: [], budget: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const setField = (key) => (e) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const setPlan  = (plan_type) => setForm(prev => ({ ...prev, plan_type }));

  const addTag   = (tag) => {
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };
  const removeTag = (tag) =>
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  const reset = () => setForm({
    destination: "", country: "", dates: "", duration: "",
    spots: "1", trip_type: "Adventure", plan_type: "moderate",
    description: "", tags: [], budget: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.country || !form.dates) {
      setError("Destination, country and dates are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await createTrip(form);
      reset();
      onSuccess?.(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create trip.");
    } finally {
      setLoading(false);
    }
  };

  return { form, setField, setPlan, addTag, removeTag, reset, submit, loading, error };
}

// ── useJoinRequests ────────────────────────────────────────────────────────────
// Trip owner: manage incoming join requests for a specific trip.
export function useJoinRequests(tripId) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(false); // false initially — no tripId yet

  useEffect(() => {
    if (!tripId) { setRequests([]); return; } // No trip selected — reset
    setLoading(true);
    fetchJoinRequests(tripId)
      .then(({ data }) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [tripId]);

  const respondToRequest = async (reqId, status) => {
    await updateRequestStatus(tripId, reqId, status);
    // Update local state immediately (optimistic)
    setRequests(prev =>
      prev.map(r => r.id === reqId ? { ...r, status } : r)
    );
  };

  return { requests, loading, respondToRequest };
}

// ── useMyRequests ──────────────────────────────────────────────────────────────
// Current user: see all their outgoing join requests.
export function useMyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchMyRequests()
      .then(({ data }) => setRequests(data))
      .finally(() => setLoading(false));
  }, []);

  return { requests, loading };
}

// ── useJoinTrip ────────────────────────────────────────────────────────────────
// Manages the "Request to Join" action state.
export function useJoinTrip() {
  const [joined,  setJoined]  = useState(new Set()); // Set of trip IDs
  const [loading, setLoading] = useState(null);       // trip ID currently processing

  const joinTrip = async (tripId, onSuccess, onError) => {
    setLoading(tripId);
    try {
      await sendJoinRequest(tripId);
      setJoined(prev => new Set([...prev, tripId]));
      onSuccess?.();
    } catch (err) {
      onError?.(err.response?.data?.error || "Could not send request.");
    } finally {
      setLoading(null);
    }
  };

  return { joined, joinTrip, isJoining: (id) => loading === id };
}
