// models/userModel.js
// ─────────────────────────────────────────────────────────────────────────────
//  User Model — All database queries related to users
//
//  In MVC, the Model layer is responsible ONLY for interacting with the
//  database. Business logic lives in controllers; queries live here.
//  This keeps code organized and easy to test/change independently.
// ─────────────────────────────────────────────────────────────────────────────

const db = require("../config/db");

// Columns we are safe to return to clients (never return password)
const SAFE_COLS = `
  id, name, email, role, age, bio, status, avatar, color, trips_count,
  DATE_FORMAT(created_at, '%b %d, %Y') AS joined
`;

const UserModel = {

  // ── findByEmail ─────────────────────────────────────────────────────────────
  // Used during login to look up a user by their email address.
  // Returns the full row including password hash for bcrypt comparison.
  findByEmail: async (email) => {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    return rows[0] || null; // Return single user or null
  },

  // ── findById ────────────────────────────────────────────────────────────────
  // Fetch a user by ID without exposing the password.
  findById: async (id) => {
    const [rows] = await db.query(
      `SELECT ${SAFE_COLS} FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  // ── create ──────────────────────────────────────────────────────────────────
  // Insert a new user and return their new ID.
  create: async ({ name, email, password, age, bio, avatar, color }) => {
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, age, bio, avatar, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.toLowerCase().trim(), password, age || 25, bio || "", avatar, color]
    );
    return result.insertId;
  },

  // ── getAll ──────────────────────────────────────────────────────────────────
  // Admin-only: fetch all non-admin users ordered by most recently joined.
  getAll: async () => {
    const [rows] = await db.query(
      `SELECT ${SAFE_COLS} FROM users WHERE role != 'admin' ORDER BY created_at DESC`
    );
    return rows;
  },

  // ── getStats ────────────────────────────────────────────────────────────────
  // Admin-only: aggregate stats for the dashboard overview.
  getStats: async () => {
    const [[total]]  = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user'");
    const [[active]] = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='active'");
    const [[susp]]   = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='suspended'");
    const [[trips]]  = await db.query("SELECT COUNT(*) AS c FROM trips");
    const [[reqs]]   = await db.query("SELECT SUM(req_count) AS s FROM trips");
    return {
      totalUsers:    total.c,
      activeUsers:   active.c,
      suspended:     susp.c,
      totalTrips:    trips.c,
      totalRequests: reqs.s || 0,
    };
  },

  // ── update ──────────────────────────────────────────────────────────────────
  // Admin: update any user's editable fields.
  update: async (id, { name, email, age, bio, status, avatar }) => {
    await db.query(
      `UPDATE users SET name=?, email=?, age=?, bio=?, status=?, avatar=? WHERE id=?`,
      [name.trim(), email.toLowerCase().trim(), age || 25, bio || "", status, avatar, id]
    );
  },

  // ── updateStatus ────────────────────────────────────────────────────────────
  // Admin: toggle active / suspended without touching other fields.
  updateStatus: async (id, status) => {
    await db.query("UPDATE users SET status=? WHERE id=?", [status, id]);
  },

  // ── updateProfile ───────────────────────────────────────────────────────────
  // User: update their own profile (name, age, bio only).
  updateProfile: async (id, { name, age, bio, avatar }) => {
    await db.query(
      "UPDATE users SET name=?, age=?, bio=?, avatar=? WHERE id=?",
      [name.trim(), age || 25, bio || "", avatar, id]
    );
  },

  // ── updatePassword ───────────────────────────────────────────────────────────
  // Store a new bcrypt-hashed password for a user.
  // Only called after verifying the old password in the controller.
  updatePassword: async (id, hashedPassword) => {
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);
  },
  // Admin: permanently delete a user (cascade deletes their trips & requests).
  delete: async (id) => {
    await db.query("DELETE FROM users WHERE id=? AND role != 'admin'", [id]);
  },

  // ── incrementTripCount ──────────────────────────────────────────────────────
  incrementTripCount: async (id) => {
    await db.query("UPDATE users SET trips_count = trips_count + 1 WHERE id=?", [id]);
  },

  // ── decrementTripCount ──────────────────────────────────────────────────────
  decrementTripCount: async (id) => {
    await db.query("UPDATE users SET trips_count = GREATEST(0, trips_count - 1) WHERE id=?", [id]);
  },
};

module.exports = UserModel;
