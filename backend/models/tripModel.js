// models/tripModel.js
// ─────────────────────────────────────────────────────────────────────────────
//  Trip Model — All database queries for trips and join_requests
//
//  Key design choices:
//    • Tags are stored as JSON string in MySQL and parsed in JS
//    • We JOIN users table to get host info alongside each trip
//    • All queries are user-scoped (WHERE user_id = ?) for security
// ─────────────────────────────────────────────────────────────────────────────

const db = require("../config/db");

// Reusable SELECT columns for trips (includes host info via JOIN)
const TRIP_SELECT = `
  t.id, t.user_id, t.destination, t.country, t.dates, t.duration,
  t.spots, t.total_spots, t.trip_type, t.plan_type, t.description,
  t.tags, t.budget, t.gradient, t.req_count,
  DATE_FORMAT(t.created_at, '%b %d, %Y') AS posted_on,
  u.name AS host, u.avatar AS host_av, u.color AS host_color
`;

// Helper: parse tags JSON string → array
const parseTrip = (trip) => ({
  ...trip,
  tags: (() => {
    try { return JSON.parse(trip.tags || "[]"); }
    catch { return []; }
  })(),
});

const TripModel = {

  // ── getAll ──────────────────────────────────────────────────────────────────
  // Fetch all trips with optional filters: trip_type, plan_type, search query.
  // Used by the Browse page.
  getAll: async ({ type, plan, q }) => {
    let sql    = `SELECT ${TRIP_SELECT} FROM trips t JOIN users u ON t.user_id = u.id WHERE 1=1`;
    const params = [];

    if (type && type !== "All") {
      sql += " AND t.trip_type = ?";
      params.push(type);
    }
    if (plan && plan !== "all") {
      sql += " AND t.plan_type = ?";
      params.push(plan);
    }
    if (q) {
      // Search across destination and country columns
      sql += " AND (t.destination LIKE ? OR t.country LIKE ? OR u.name LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY t.created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows.map(parseTrip);
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT ${TRIP_SELECT} FROM trips t JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [id]
    );
    return rows[0] ? parseTrip(rows[0]) : null;
  },

  // ── getByUserId ─────────────────────────────────────────────────────────────
  // Fetch all trips posted by a specific user (My Trips tab).
  getByUserId: async (userId) => {
    const [rows] = await db.query(
      `SELECT ${TRIP_SELECT} FROM trips t JOIN users u ON t.user_id = u.id
       WHERE t.user_id = ? ORDER BY t.created_at DESC`,
      [userId]
    );
    return rows.map(parseTrip);
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create: async (data) => {
    const GRADIENTS = [
      "linear-gradient(135deg,#1a3d2b,#0a1f12)",
      "linear-gradient(135deg,#2e6b8a,#1a3c52)",
      "linear-gradient(135deg,#6b4c1a,#3d2a0a)",
      "linear-gradient(135deg,#8a3a1a,#4d1f0a)",
      "linear-gradient(135deg,#1a6b4a,#0d3d28)",
      "linear-gradient(135deg,#4a1a6b,#260d3d)",
    ];
    const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const spots    = parseInt(data.spots) || 1;
    const tags     = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);

    const [result] = await db.query(
      `INSERT INTO trips
         (user_id, destination, country, dates, duration, spots, total_spots,
          trip_type, plan_type, description, tags, budget, gradient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId, data.destination, data.country, data.dates,
        data.duration || "", spots, spots,
        data.trip_type || "Adventure", data.plan_type || "moderate",
        data.description || "", tags, data.budget || "", gradient,
      ]
    );
    return result.insertId;
  },

  // ── update ──────────────────────────────────────────────────────────────────
  update: async (id, data) => {
    const tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
    await db.query(
      `UPDATE trips SET destination=?, country=?, dates=?, duration=?,
        spots=?, trip_type=?, plan_type=?, description=?, tags=?, budget=?
       WHERE id=?`,
      [
        data.destination, data.country, data.dates, data.duration,
        parseInt(data.spots) || 1, data.trip_type, data.plan_type,
        data.description, tags, data.budget, id,
      ]
    );
  },

  // ── delete ──────────────────────────────────────────────────────────────────
  delete: async (id) => {
    await db.query("DELETE FROM trips WHERE id=?", [id]);
  },

  // ── getUserIdByTripId ────────────────────────────────────────────────────────
  // Quick ownership check — returns the user_id who owns a trip.
  getUserIdByTripId: async (tripId) => {
    const [rows] = await db.query("SELECT user_id FROM trips WHERE id=?", [tripId]);
    return rows[0]?.user_id || null;
  },

  // ── createJoinRequest ───────────────────────────────────────────────────────
  // Insert a join request; will throw on duplicate (UNIQUE constraint).
  createJoinRequest: async (tripId, requesterId) => {
    await db.query(
      "INSERT INTO join_requests (trip_id, requester_id) VALUES (?, ?)",
      [tripId, requesterId]
    );
    // Increment the request counter shown on the trip card
    await db.query("UPDATE trips SET req_count = req_count + 1 WHERE id=?", [tripId]);
  },

  // ── getJoinRequests ─────────────────────────────────────────────────────────
  // For the trip owner: see who has requested to join a specific trip.
  getJoinRequests: async (tripId) => {
    const [rows] = await db.query(
      `SELECT jr.id, jr.status, DATE_FORMAT(jr.created_at,'%b %d') AS requested_on,
              u.id AS user_id, u.name, u.email, u.avatar, u.color, u.age, u.bio
       FROM join_requests jr
       JOIN users u ON jr.requester_id = u.id
       WHERE jr.trip_id = ?
       ORDER BY jr.created_at DESC`,
      [tripId]
    );
    return rows;
  },

  // ── updateJoinRequestStatus ─────────────────────────────────────────────────
  updateJoinRequestStatus: async (requestId, tripId, status) => {
    await db.query(
      "UPDATE join_requests SET status=? WHERE id=? AND trip_id=?",
      [status, requestId, tripId]
    );
    // If accepted, reduce available spots by 1
    if (status === "accepted") {
      await db.query("UPDATE trips SET spots = GREATEST(0, spots - 1) WHERE id=?", [tripId]);
    }
  },

  // ── getMyRequests ────────────────────────────────────────────────────────────
  // For a user: see all the trips they've requested to join.
  getMyRequests: async (userId) => {
    const [rows] = await db.query(
      `SELECT jr.id, jr.status, DATE_FORMAT(jr.created_at,'%b %d') AS requested_on,
              t.id AS trip_id, t.destination, t.country, t.dates, t.plan_type,
              u.name AS host
       FROM join_requests jr
       JOIN trips t ON jr.trip_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE jr.requester_id = ?
       ORDER BY jr.created_at DESC`,
      [userId]
    );
    return rows;
  },

  // ── hasRequested ────────────────────────────────────────────────────────────
  // Check if a user already sent a join request for a trip.
  hasRequested: async (tripId, userId) => {
    const [rows] = await db.query(
      "SELECT id FROM join_requests WHERE trip_id=? AND requester_id=?",
      [tripId, userId]
    );
    return rows.length > 0;
  },
};

module.exports = TripModel;
