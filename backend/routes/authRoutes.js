// routes/authRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Routes — /api/auth
//
//  Public:    POST /api/auth/register  → create account
//             POST /api/auth/login     → returns JWT
//  Protected: GET  /api/auth/me        → returns logged-in user
// ─────────────────────────────────────────────────────────────────────────────

const express        = require("express");
const { register, login, getMe, updateProfile, changePassword } = require("../controllers/authController");
const { protect }    = require("../middleware/authMiddleware");

const router = express.Router();

// ── Public routes (no token needed) ───────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);

// ── Protected routes (JWT required) ───────────────────────────────────────────
router.get("/me",          protect, getMe);

// PUT /api/auth/profile  → update name, age, bio
// The user edits their own profile — no admin access needed.
router.put("/profile",    protect, updateProfile);

// PUT /api/auth/password → change password (requires current password)
// Separate endpoint from profile so password change is an explicit action.
router.put("/password",   protect, changePassword);

module.exports = router;
