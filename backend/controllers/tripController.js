// controllers/tripController.js
// ─────────────────────────────────────────────────────────────────────────────
//  Trip Controller — CRUD for trips, join requests, and admin user management
//
//  Endpoints handled:
//    Trips:
//      GET    /api/trips             → browse (with filters)
//      GET    /api/trips/my          → current user's trips
//      GET    /api/trips/:id         → single trip detail
//      POST   /api/trips             → create new trip
//      PUT    /api/trips/:id         → edit trip (owner or admin)
//      DELETE /api/trips/:id         → delete trip (owner or admin)
//
//    Join Requests:
//      POST   /api/trips/:id/join                 → send join request
//      GET    /api/trips/:id/requests             → trip owner sees requests
//      PATCH  /api/trips/:id/requests/:rid        → accept or decline
//      GET    /api/trips/requests/mine            → requester sees their requests
//
//    Admin — Users:
//      GET    /api/trips/admin/users              → list all users
//      GET    /api/trips/admin/stats              → platform stats
//      PUT    /api/trips/admin/users/:id          → edit user
//      PATCH  /api/trips/admin/users/:id/status   → suspend / activate
//      DELETE /api/trips/admin/users/:id          → delete user
// ─────────────────────────────────────────────────────────────────────────────

const TripModel = require("../models/tripModel");
const UserModel = require("../models/userModel");

// ─── TRIPS ────────────────────────────────────────────────────────────────────

// GET /api/trips — browse all trips (optional filters via query params)
const getAllTrips = async (req, res) => {
  try {
    const { type, plan, q } = req.query;
    const trips = await TripModel.getAll({ type, plan, q });
    res.json(trips);
  } catch (err) {
    console.error("getAllTrips error:", err);
    res.status(500).json({ error: "Failed to fetch trips." });
  }
};

// GET /api/trips/my — trips posted by the logged-in user
const getMyTrips = async (req, res) => {
  try {
    const trips = await TripModel.getByUserId(req.user.id);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your trips." });
  }
};

// GET /api/trips/:id — single trip with full details
const getTripById = async (req, res) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trip." });
  }
};

// POST /api/trips — create a new trip
const createTrip = async (req, res) => {
  try {
    const { destination, country, dates } = req.body;

    // Validate required fields
    if (!destination || !country || !dates) {
      return res.status(400).json({ error: "Destination, country and dates are required." });
    }

    // Create trip with the current user as owner
    const tripId = await TripModel.create({ ...req.body, userId: req.user.id });

    // Increment user's trip count
    await UserModel.incrementTripCount(req.user.id);

    // Return the full trip object (with host info)
    const trip = await TripModel.getById(tripId);
    res.status(201).json(trip);
  } catch (err) {
    console.error("createTrip error:", err);
    res.status(500).json({ error: "Failed to create trip." });
  }
};

// PUT /api/trips/:id — update a trip (owner only, or admin)
const updateTrip = async (req, res) => {
  try {
    const ownerId = await TripModel.getUserIdByTripId(req.params.id);
    if (!ownerId) return res.status(404).json({ error: "Trip not found." });

    // Only the trip owner or an admin can edit
    if (ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to edit this trip." });
    }

    await TripModel.update(req.params.id, req.body);
    const updated = await TripModel.getById(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update trip." });
  }
};

// DELETE /api/trips/:id — delete a trip
const deleteTrip = async (req, res) => {
  try {
    const ownerId = await TripModel.getUserIdByTripId(req.params.id);
    if (!ownerId) return res.status(404).json({ error: "Trip not found." });

    if (ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this trip." });
    }

    await TripModel.delete(req.params.id);
    await UserModel.decrementTripCount(ownerId); // Keep count accurate
    res.json({ success: true, message: "Trip deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trip." });
  }
};

// ─── JOIN REQUESTS ─────────────────────────────────────────────────────────────

// POST /api/trips/:id/join — send a join request
const sendJoinRequest = async (req, res) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found." });

    // Prevent joining your own trip
    if (trip.user_id === req.user.id) {
      return res.status(400).json({ error: "You cannot join your own trip." });
    }

    // Prevent joining a full trip
    if (trip.spots <= 0) {
      return res.status(400).json({ error: "This trip has no available spots." });
    }

    // Prevent duplicate requests
    const alreadyRequested = await TripModel.hasRequested(trip.id, req.user.id);
    if (alreadyRequested) {
      return res.status(409).json({ error: "You have already requested to join this trip." });
    }

    await TripModel.createJoinRequest(trip.id, req.user.id);
    res.json({ success: true, message: `Request sent for ${trip.destination}!` });
  } catch (err) {
    console.error("sendJoinRequest error:", err);
    res.status(500).json({ error: "Failed to send join request." });
  }
};

// GET /api/trips/:id/requests — trip owner views all requests for their trip
const getJoinRequests = async (req, res) => {
  try {
    const ownerId = await TripModel.getUserIdByTripId(req.params.id);
    if (!ownerId) return res.status(404).json({ error: "Trip not found." });

    if (ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized." });
    }

    const requests = await TripModel.getJoinRequests(req.params.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests." });
  }
};

// PATCH /api/trips/:id/requests/:rid — accept or decline a request
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'accepted' or 'declined'." });
    }

    const ownerId = await TripModel.getUserIdByTripId(req.params.id);
    if (ownerId !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can manage requests." });
    }

    await TripModel.updateJoinRequestStatus(req.params.rid, req.params.id, status);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: "Failed to update request." });
  }
};

// GET /api/trips/requests/mine — user sees all their outgoing join requests
const getMyRequests = async (req, res) => {
  try {
    const requests = await TripModel.getMyRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your requests." });
  }
};

// ─── ADMIN — USER MANAGEMENT ──────────────────────────────────────────────────

// GET /api/trips/admin/users
const adminGetAllUsers = async (req, res) => {
  try {
    const users = await UserModel.getAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

// GET /api/trips/admin/stats
const adminGetStats = async (req, res) => {
  try {
    const stats = await UserModel.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats." });
  }
};

// PUT /api/trips/admin/users/:id
const adminUpdateUser = async (req, res) => {
  try {
    const { name, email, age, bio, status } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required." });

    const avatar = name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    await UserModel.update(req.params.id, { name, email, age, bio, status, avatar });
    const updated = await UserModel.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user." });
  }
};

// PATCH /api/trips/admin/users/:id/status
const adminToggleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }
    await UserModel.updateStatus(req.params.id, status);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status." });
  }
};

// DELETE /api/trips/admin/users/:id
const adminDeleteUser = async (req, res) => {
  try {
    await UserModel.delete(req.params.id);
    res.json({ success: true, message: "User deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
};

module.exports = {
  getAllTrips, getMyTrips, getTripById,
  createTrip, updateTrip, deleteTrip,
  sendJoinRequest, getJoinRequests, updateRequestStatus, getMyRequests,
  adminGetAllUsers, adminGetStats, adminUpdateUser, adminToggleStatus, adminDeleteUser,
};
