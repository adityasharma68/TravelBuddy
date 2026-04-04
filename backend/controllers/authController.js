// controllers/authController.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Controller — Handles user registration, login, and profile fetch
//
//  In MVC:  Route → Controller → Model → Response
//  The controller orchestrates: validates input, calls the model,
//  builds the response. It does NOT write SQL queries (that's the model).
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const UserModel = require("../models/userModel");

// ── Helper: generate a JWT ────────────────────────────────────────────────────
const signToken = (id, role) =>
  jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ── Helper: build avatar initials from full name ──────────────────────────────
const makeAvatar = (name) =>
  name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

// ── Helper: pick a random color for the avatar ────────────────────────────────
const COLORS = ["#c8587a","#2e6b8a","#d4720e","#1a6b4a","#4a7c3f","#6b4c1a","#8a3a5c"];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
//  Body: { name, email, password, age?, bio? }
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, age, bio } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // 2. Check if email is already taken
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "This email is already registered." });
    }

    // 3. Hash the password — never store plain text
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    // 4. Create the user in the database
    const userId = await UserModel.create({
      name, email, password: hashedPassword,
      age:    parseInt(age) || 25,
      bio:    bio || "",
      avatar: makeAvatar(name),
      color:  randomColor(),
    });

    // 5. Fetch the created user (without password) to return
    const user = await UserModel.findById(userId);

    // 6. Sign JWT
    const token = signToken(user.id, user.role);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Body: { email, password }
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // 2. Look up user by email (includes hashed password)
    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Return the same message for wrong email OR wrong password (security best practice)
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 3. Compare submitted password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 4. Block suspended accounts
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account has been suspended. Contact admin." });
    }

    // 5. Build safe user object (exclude password)
    const { password: _, ...safeUser } = user;

    // 6. Sign JWT and respond
    const token = signToken(user.id, user.role);
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me   (protected)
//  Returns the currently logged-in user's fresh data from DB.
//  Useful when the frontend reloads and wants to re-validate the session.
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // req.user is attached by the authMiddleware
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(user);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ error: "Could not fetch user." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/auth/profile   (protected)
//  Allows a logged-in user to update their own name, age, and bio.
//  Email cannot be changed here for security — it's the login identifier.
//
//  Body: { name, age, bio }
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, age, bio } = req.body;

    // 1. Validate required field
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    // 2. Rebuild avatar initials from the new name
    const avatar = makeAvatar(name);

    // 3. Persist changes in DB
    await UserModel.updateProfile(req.user.id, {
      name: name.trim(),
      age:  parseInt(age) || 25,
      bio:  bio || "",
      avatar,
    });

    // 4. Return fresh user data so the frontend can update global state
    const updated = await UserModel.findById(req.user.id);
    res.json(updated);
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/auth/password   (protected)
//  Allows a logged-in user to change their own password.
//  Requires current password for verification (prevents unauthorized changes).
//
//  Body: { currentPassword, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from current password." });
    }

    // 2. Fetch full user record (includes hashed password)
    const user = await UserModel.findByEmail(
      // findByEmail works if we fetch email from DB first
      (await UserModel.findById(req.user.id)).email
    );

    // 3. Verify the current password is correct before allowing a change
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // 4. Hash the new password and save
    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(req.user.id, hashed);

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ error: "Failed to change password." });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
