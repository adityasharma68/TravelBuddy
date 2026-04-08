// middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────────────────────────
//  JWT Authentication Middleware
//
//  Two exported functions:
//    protect    → verifies the JWT token in the Authorization header
//    adminOnly  → extends protect and also checks that role === 'admin'
//
//  Usage in routes:
//    router.get("/me",        protect,    getMe);
//    router.get("/all-users", adminOnly,  getAllUsers);
// ─────────────────────────────────────────────────────────────────────────────

const jwt  = require("jsonwebtoken");
const db   = require("../config/db");

// ── protect ───────────────────────────────────────────────────────────────────
// Reads the Bearer token from the Authorization header, verifies it,
// fetches the user from DB, and attaches it to req.user for downstream use.
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided. Please log in." });
    }

    const token = authHeader.split(" ")[1]; // Get the token part after "Bearer "

    // 2. Verify the token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch fresh user data from DB (in case role/status changed since login)
    const [rows] = await db.query(
      "SELECT id, name, email, role, status, avatar, color FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    const user = rows[0];

    // 4. Block suspended accounts
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account is suspended. Contact admin." });
    }

    // 5. Attach user to request object for use in controllers
    req.user = user;
    next();
  } catch (err) {
    // Handle expired token separately for better UX
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
};

// ── adminOnly ─────────────────────────────────────────────────────────────────
// Runs protect first, then checks if the user is an admin.
// Used for routes that only admins should access.
const adminOnly = (req, res, next) => {
  // First run the standard JWT check
  protect(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
  });
};

module.exports = { protect, adminOnly };
