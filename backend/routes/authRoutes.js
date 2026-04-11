// routes/authRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Routes — /api/auth
//
//  Public:
//    POST /api/auth/register         → email/password signup
//    POST /api/auth/login            → email/password login
//    POST /api/auth/google           → Google OAuth sign-in/sign-up
//    POST /api/auth/forgot-password  → sends OTP reset email
//    POST /api/auth/reset-password   → verifies OTP, sets new password
//
//  Protected (JWT required):
//    GET  /api/auth/me               → get current user
//    PUT  /api/auth/profile          → update name/age/bio
//    PUT  /api/auth/password         → change password
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const {
  register, login, googleAuth,
  forgotPassword, resetPassword,
  getMe, updateProfile, changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post("/register",        register);
router.post("/login",           login);
router.post("/google",          googleAuth);        // Feature 1: Google OAuth
router.post("/forgot-password", forgotPassword);    // Feature 1: Forgot password
router.post("/reset-password",  resetPassword);     // Feature 1: Reset with OTP

// ── Protected ─────────────────────────────────────────────────────────────────
router.get ("/me",       protect, getMe);
router.put ("/profile",  protect, updateProfile);
router.put ("/password", protect, changePassword);

module.exports = router;
