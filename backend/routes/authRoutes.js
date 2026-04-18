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
const {
  validateRegister, validateLogin,
  validateForgotPassword, validateResetPassword,
  validateProfile, validateChangePassword,
} = require("../middleware/validate");

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Validators run BEFORE controllers — invalid requests are rejected early
router.post("/register",        validateRegister,        register);
router.post("/login",           validateLogin,           login);
router.post("/google",                                   googleAuth);
router.post("/forgot-password", validateForgotPassword,  forgotPassword);
router.post("/reset-password",  validateResetPassword,   resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get ("/me",       protect,                          getMe);
router.put ("/profile",  protect, validateProfile,         updateProfile);
router.put ("/password", protect, validateChangePassword,  changePassword);

module.exports = router;
