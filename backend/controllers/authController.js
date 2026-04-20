// controllers/authController.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Controller
//
//  Endpoints:
//    POST /api/auth/register      — email/password signup
//    POST /api/auth/login         — email/password login
//    POST /api/auth/google        — Google OAuth (Feature 1)
//    POST /api/auth/forgot-password — sends OTP email (Feature 1)
//    POST /api/auth/reset-password  — verifies OTP + sets new password (Feature 1)
//    GET  /api/auth/me            — get current user
//    PUT  /api/auth/profile       — update profile
//    PUT  /api/auth/password      — change password
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const crypto    = require("crypto");
const nodemailer = require("nodemailer");
// google-auth-library not needed — we verify via Google userinfo endpoint
const UserModel = require("../models/userModel");

// ── Helpers ───────────────────────────────────────────────────────────────────
const signToken  = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const makeAvatar = (name) =>
  name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const COLORS = ["#c8587a","#2e6b8a","#d4720e","#1a6b4a","#4a7c3f","#6b4c1a","#8a3a5c"];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];


// Nodemailer transporter — reused for all outgoing emails
const createMailer = () => nodemailer.createTransport({
  host:   process.env.MAIL_HOST   || "smtp.gmail.com",
  port:   parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, age, bio } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: "This email is already registered." });

    const hashedPw = await bcrypt.hash(password, 10);
    const userId   = await UserModel.create({
      name, email,
      password: hashedPw,
      age: parseInt(age) || 25,
      bio: bio || "",
      avatar:  makeAvatar(name),
      color:   randomColor(),
    });

    const user  = await UserModel.findById(userId);
    const token = signToken(user.id, user.role);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    // findByEmail returns raw Mongoose doc (includes password hash)
    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    if (!user.password) {
      return res.status(401).json({
        error: "This account uses Google Sign-In. Please click 'Continue with Google'.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid email or password." });
    if (user.status === "suspended") return res.status(403).json({ error: "Account suspended. Contact admin." });

    // Return safe user (findById strips password)
    const safeUser = await UserModel.findById(user._id.toString());
    const token    = signToken(user._id.toString(), user.role);
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/google
//  Body: { credential } — the ID token from Google Sign-In
//
//  Flow:
//    1. Verify the ID token with Google's servers
//    2. Extract name, email, picture, sub (Google user ID)
//    3. If user exists by google_id → log them in
//    4. If user exists by email → link google_id to existing account
//    5. If new → create account (no password needed)
// ─────────────────────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential is required." });

    // Verify the ID token using google-auth-library
    const { OAuth2Client } = require("google-auth-library");
    const client  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket  = await client.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 3. Existing Google account?
    let user = await UserModel.findByGoogleId(googleId);

    if (!user) {
      // 4. Existing email account? Link Google to it.
      user = await UserModel.findByEmail(email);
      if (user) {
        await UserModel.linkGoogleId(user.id, googleId, picture);
      } else {
        // 5. Brand new user — create without a password
        const userId = await UserModel.create({
          name:      name   || email.split("@")[0],
          email,
          password:  null,   // Google-only account has no password
          age:       25,
          bio:       "",
          avatar:    makeAvatar(name || email),
          color:     randomColor(),
          googleId,
          avatarUrl: picture || null,
        });
        user = await UserModel.findById(userId);
      }
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended. Contact admin." });
    }

    // Fetch fresh (in case we just linked)
    const freshUser = await UserModel.findById(user.id);
    const token     = signToken(freshUser.id, freshUser.role);
    res.json({ token, user: freshUser });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Google authentication failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/forgot-password
//  Body: { email }
//
//  Generates a 6-digit OTP, hashes and stores it, emails the plain OTP.
//  OTP expires in 15 minutes.
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await UserModel.findByEmail(email);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({ message: "If that email exists, a reset code has been sent." });
    }

    // Generate 6-digit OTP
    const otp       = crypto.randomInt(100000, 999999).toString();
    const otpHash   = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await UserModel.saveResetToken(email, otpHash, expiresAt);

    // Send email
    const mailer = createMailer();
    await mailer.sendMail({
      from:    process.env.MAIL_FROM || "Travel Buddy <noreply@travelbuddy.com>",
      to:      email,
      subject: "🔑 Your Travel Buddy Password Reset Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <img src="cid:logo" alt="Travel Buddy" style="height:40px;margin-bottom:24px"/>
          <h2 style="color:#1a3d2b;margin:0 0 8px">Password Reset Code</h2>
          <p style="color:#555;margin:0 0 24px">
            You requested a password reset for your Travel Buddy account.
            Use the code below — it expires in <strong>15 minutes</strong>.
          </p>
          <div style="background:#f4ede3;border:2px solid #1a3d2b;border-radius:16px;
                      padding:24px;text-align:center;margin-bottom:24px">
            <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1a3d2b">
              ${otp}
            </div>
          </div>
          <p style="color:#999;font-size:13px">
            If you didn't request this, you can safely ignore this email.
            Your password will not be changed.
          </p>
        </div>
      `,
    });

    res.json({ message: "If that email exists, a reset code has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Failed to send reset email. Check your mail config in .env." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/reset-password
//  Body: { email, otp, newPassword }
//
//  Verifies the OTP hash, sets the new password, clears the token.
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Find user with a valid (non-expired) reset token
    const user = await UserModel.findByResetToken(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." });
    }

    // Compare submitted OTP with stored hash
    const valid = await bcrypt.compare(otp, user.reset_token);
    if (!valid) {
      return res.status(400).json({ error: "Incorrect reset code. Please check the email." });
    }

    // Set new hashed password and clear the token
    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(user.id, hashed);
    await UserModel.clearResetToken(user.id);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch user." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, age, bio } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
    const avatar = makeAvatar(name);
    await UserModel.updateProfile(req.user.id, { name: name.trim(), age: parseInt(age) || 25, bio: bio || "", avatar });
    const updated = await UserModel.findById(req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/auth/password
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required." });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be 6+ chars." });

    // findById returns safe object (no password). We need raw doc for password check.
    const safeUser = await UserModel.findById(req.user.id);
    const rawUser  = await UserModel.findByEmail(safeUser.email);
    if (!rawUser.password) return res.status(400).json({ error: "Google accounts don't have a password to change here." });

    const match = await bcrypt.compare(currentPassword, rawUser.password);
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(req.user.id, hashed);
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password." });
  }
};

module.exports = { register, login, googleAuth, forgotPassword, resetPassword, getMe, updateProfile, changePassword };
