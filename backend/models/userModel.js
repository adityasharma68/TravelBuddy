// models/userModel.js
// ─────────────────────────────────────────────────────────────────────────────
//  User Model — All database queries related to users
//
//  New columns added for Feature 1 & 2:
//    google_id      — stores Google OAuth user ID (nullable, unique)
//    avatar_url     — Cloudinary URL for profile picture (nullable)
//    reset_token    — hashed OTP for forgot-password flow (nullable)
//    reset_expires  — expiry timestamp for the reset OTP
// ─────────────────────────────────────────────────────────────────────────────

const db = require("../config/db");

const SAFE_COLS = `
  id, name, email, role, age, bio, status, avatar, color,
  avatar_url, google_id IS NOT NULL AS has_google,
  trips_count, DATE_FORMAT(created_at, '%b %d, %Y') AS joined
`;

const UserModel = {

  // ── findByEmail ─────────────────────────────────────────────────────────────
  findByEmail: async (email) => {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  // ── findById ────────────────────────────────────────────────────────────────
  findById: async (id) => {
    const [rows] = await db.query(
      `SELECT ${SAFE_COLS} FROM users WHERE id = ?`, [id]
    );
    return rows[0] || null;
  },

  // ── findByGoogleId ──────────────────────────────────────────────────────────
  // Used during Google OAuth — look up a user by their Google account ID.
  findByGoogleId: async (googleId) => {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE google_id = ?", [googleId]
    );
    return rows[0] || null;
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create: async ({ name, email, password, age, bio, avatar, color, googleId, avatarUrl }) => {
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, age, bio, avatar, color, google_id, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        password || null,     // null for Google-only users (no password)
        age  || 25,
        bio  || "",
        avatar,
        color,
        googleId   || null,
        avatarUrl  || null,
      ]
    );
    return result.insertId;
  },

  // ── linkGoogleId ─────────────────────────────────────────────────────────────
  // Called when an existing email-password user logs in with Google for the
  // first time — links their Google account to the existing record.
  linkGoogleId: async (userId, googleId, avatarUrl) => {
    await db.query(
      "UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
      [googleId, avatarUrl, userId]
    );
  },

  // ── getAll ──────────────────────────────────────────────────────────────────
  getAll: async () => {
    const [rows] = await db.query(
      `SELECT ${SAFE_COLS} FROM users WHERE role != 'admin' ORDER BY created_at DESC`
    );
    return rows;
  },

  // ── getStats ────────────────────────────────────────────────────────────────
  getStats: async () => {
    const [[total]]  = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user'");
    const [[active]] = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='active'");
    const [[susp]]   = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='suspended'");
    const [[trips]]  = await db.query("SELECT COUNT(*) AS c FROM trips");
    const [[reqs]]   = await db.query("SELECT SUM(req_count) AS s FROM trips");
    return {
      totalUsers: total.c, activeUsers: active.c,
      suspended:  susp.c,  totalTrips:  trips.c,
      totalRequests: reqs.s || 0,
    };
  },

  // ── update ──────────────────────────────────────────────────────────────────
  update: async (id, { name, email, age, bio, status, avatar }) => {
    await db.query(
      `UPDATE users SET name=?, email=?, age=?, bio=?, status=?, avatar=? WHERE id=?`,
      [name.trim(), email.toLowerCase().trim(), age || 25, bio || "", status, avatar, id]
    );
  },

  // ── updateStatus ────────────────────────────────────────────────────────────
  updateStatus: async (id, status) => {
    await db.query("UPDATE users SET status=? WHERE id=?", [status, id]);
  },

  // ── updateProfile ───────────────────────────────────────────────────────────
  updateProfile: async (id, { name, age, bio, avatar }) => {
    await db.query(
      "UPDATE users SET name=?, age=?, bio=?, avatar=? WHERE id=?",
      [name.trim(), age || 25, bio || "", avatar, id]
    );
  },

  // ── updateAvatar ─────────────────────────────────────────────────────────────
  // Saves the Cloudinary URL returned after a successful image upload.
  updateAvatar: async (id, avatarUrl) => {
    await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, id]);
  },

  // ── updatePassword ──────────────────────────────────────────────────────────
  updatePassword: async (id, hashedPassword) => {
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);
  },

  // ── saveResetToken ──────────────────────────────────────────────────────────
  // Store a hashed 6-digit OTP and its 15-minute expiry for password reset.
  saveResetToken: async (email, hashedToken, expiresAt) => {
    await db.query(
      "UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?",
      [hashedToken, expiresAt, email.toLowerCase()]
    );
  },

  // ── findByResetToken ────────────────────────────────────────────────────────
  // Find a user with a valid (non-expired) reset token.
  findByResetToken: async (email) => {
    const [rows] = await db.query(
      `SELECT id, email, reset_token, reset_expires
       FROM users WHERE email = ? AND reset_expires > NOW()`,
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  // ── clearResetToken ─────────────────────────────────────────────────────────
  clearResetToken: async (id) => {
    await db.query(
      "UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE id = ?",
      [id]
    );
  },

  // ── delete ──────────────────────────────────────────────────────────────────
  delete: async (id) => {
    await db.query("DELETE FROM users WHERE id=? AND role != 'admin'", [id]);
  },

  incrementTripCount: async (id) => {
    await db.query("UPDATE users SET trips_count = trips_count + 1 WHERE id=?", [id]);
  },
  decrementTripCount: async (id) => {
    await db.query("UPDATE users SET trips_count = GREATEST(0, trips_count - 1) WHERE id=?", [id]);
  },
};

module.exports = UserModel;
