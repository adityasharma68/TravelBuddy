// src/hooks/useAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
//  useAdmin — Custom hook that manages all admin dashboard data
//
//  Centralises the fetch + mutation logic for the admin panel.
//  Follows the same pattern as useTrips.js for consistency.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  adminFetchAllUsers,
  adminFetchStats,
  adminUpdateUser,
  adminToggleStatus,
  adminDeleteUser,
  fetchTrips,
  deleteTrip,
} from "../services/tripService";

export function useAdminData() {
  const [users,   setUsers]   = useState([]);
  const [trips,   setTrips]   = useState([]);
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Load all data in parallel on mount ────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: u }, { data: s }, { data: t }] = await Promise.all([
        adminFetchAllUsers(),
        adminFetchStats(),
        fetchTrips({}),
      ]);
      setUsers(u);
      setStats(s);
      setTrips(t);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── User mutations ─────────────────────────────────────────────────────────

  const updateUser = async (id, formData) => {
    const { data } = await adminUpdateUser(id, formData);
    // Update in local state so UI refreshes without a full reload
    setUsers(prev => prev.map(u => u.id === id ? data : u));
    return data;
  };

  const toggleUserStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await adminToggleStatus(id, newStatus);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    return newStatus;
  };

  const removeUser = async (id) => {
    await adminDeleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    // Refresh stats after deletion
    const { data: s } = await adminFetchStats();
    setStats(s);
  };

  // ── Trip mutations ─────────────────────────────────────────────────────────

  const removeTrip = async (id) => {
    await deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
    // Refresh stats
    const { data: s } = await adminFetchStats();
    setStats(s);
  };

  return {
    users, trips, stats,
    loading, error,
    refetch: loadAll,
    updateUser, toggleUserStatus, removeUser, removeTrip,
  };
}
