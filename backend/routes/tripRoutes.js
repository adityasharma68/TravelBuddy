// routes/tripRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Trip Routes — /api/trips
//
//  Route order matters in Express: specific paths BEFORE param paths.
//  e.g. "/requests/mine" must come before "/:id" to avoid param collision.
// ─────────────────────────────────────────────────────────────────────────────

const express      = require("express");
const ctrl         = require("../controllers/tripController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ── Admin — User Management (must come before /:id to avoid collision) ────────
router.get   ("/admin/stats",                adminOnly, ctrl.adminGetStats);
router.get   ("/admin/users",                adminOnly, ctrl.adminGetAllUsers);
router.put   ("/admin/users/:id",            adminOnly, ctrl.adminUpdateUser);
router.patch ("/admin/users/:id/status",     adminOnly, ctrl.adminToggleStatus);
router.delete("/admin/users/:id",            adminOnly, ctrl.adminDeleteUser);

// ── User-specific (also before /:id) ─────────────────────────────────────────
router.get("/my",            protect, ctrl.getMyTrips);
router.get("/requests/mine", protect, ctrl.getMyRequests);

// ── Public & Protected Trip CRUD ──────────────────────────────────────────────
router.get   ("/",    ctrl.getAllTrips);       // Public — anyone can browse
router.post  ("/",    protect, ctrl.createTrip);
router.get   ("/:id", ctrl.getTripById);
router.put   ("/:id", protect, ctrl.updateTrip);
router.delete("/:id", protect, ctrl.deleteTrip);

// ── Join Requests (scoped under a trip) ───────────────────────────────────────
router.post  ("/:id/join",             protect, ctrl.sendJoinRequest);
router.get   ("/:id/requests",         protect, ctrl.getJoinRequests);
router.patch ("/:id/requests/:rid",    protect, ctrl.updateRequestStatus);

module.exports = router;
