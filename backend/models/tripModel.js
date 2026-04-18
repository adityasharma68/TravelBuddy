// models/tripModel.js
// ─────────────────────────────────────────────────────────────────────────────
//  Trip Model — Mongoose schemas for trips and join_requests
//
//  MongoDB difference from SQL:
//    • No JOIN — we use .populate() to embed user data into trip documents
//    • Tags stored as a native array (no JSON.stringify needed)
//    • req_count kept as a counter field on the trip document
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

// ── Trip Schema ───────────────────────────────────────────────────────────────
const tripSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    destination: { type: String, required: true, trim: true },
    country:     { type: String, required: true, trim: true },
    dates:       { type: String, required: true },
    duration:    { type: String, default: "" },
    spots:       { type: Number, default: 1 },
    total_spots: { type: Number, default: 1 },
    trip_type:   { type: String, enum: ["Adventure","Cultural","Leisure"], default: "Adventure" },
    plan_type:   { type: String, enum: ["luxury","moderate","budget"],     default: "moderate" },
    description: { type: String, default: "" },
    tags:        { type: [String], default: [] },          // native array — no JSON needed
    budget:      { type: String, default: "" },
    gradient:    { type: String, default: "" },
    req_count:   { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

tripSchema.virtual("posted_on").get(function () {
  return this.createdAt
    ? this.createdAt.toLocaleDateString("en-US", { month:"short", day:"2-digit", year:"numeric" })
    : "";
});

// ── JoinRequest Schema ────────────────────────────────────────────────────────
const joinRequestSchema = new mongoose.Schema(
  {
    trip_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Trip",  required: true },
    requester_id: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    status:       { type: String, enum: ["pending","accepted","declined"], default: "pending" },
  },
  { timestamps: true }
);

// Unique constraint: one request per user per trip
joinRequestSchema.index({ trip_id: 1, requester_id: 1 }, { unique: true });

const Trip        = mongoose.model("Trip",        tripSchema);
const JoinRequest = mongoose.model("JoinRequest", joinRequestSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: flatten a populated trip doc into the same shape the frontend expects
// ─────────────────────────────────────────────────────────────────────────────
const formatTrip = (doc) => {
  const t   = doc.toObject ? doc.toObject() : { ...doc };
  const usr = t.user_id || {};                             // populated User doc
  return {
    id:          t._id.toString(),
    user_id:     typeof usr === "object" ? usr._id?.toString() : usr.toString(),
    destination: t.destination,
    country:     t.country,
    dates:       t.dates,
    duration:    t.duration,
    spots:       t.spots,
    total_spots: t.total_spots,
    trip_type:   t.trip_type,
    plan_type:   t.plan_type,
    description: t.description,
    tags:        t.tags || [],
    budget:      t.budget,
    gradient:    t.gradient,
    req_count:   t.req_count,
    posted_on:   t.posted_on || "",
    // Host info (populated from users collection)
    host:        usr.name    || "",
    host_av:     usr.avatar  || "",
    host_color:  usr.color   || "#1a3d2b",
  };
};

const POPULATE_USER = { path: "user_id", select: "name avatar color" };

const GRADIENTS = [
  "linear-gradient(135deg,#1a3d2b,#0a1f12)",
  "linear-gradient(135deg,#2e6b8a,#1a3c52)",
  "linear-gradient(135deg,#6b4c1a,#3d2a0a)",
  "linear-gradient(135deg,#8a3a1a,#4d1f0a)",
  "linear-gradient(135deg,#1a6b4a,#0d3d28)",
  "linear-gradient(135deg,#4a1a6b,#260d3d)",
];

// ─────────────────────────────────────────────────────────────────────────────
const TripModel = {

  // ── getAll ──────────────────────────────────────────────────────────────────
  getAll: async ({ type, plan, q }) => {
    const filter = {};
    if (type && type !== "All") filter.trip_type = type;
    if (plan && plan !== "all") filter.plan_type = plan;
    if (q) {
      filter.$or = [
        { destination: { $regex: q, $options: "i" } },
        { country:     { $regex: q, $options: "i" } },
      ];
    }
    const docs = await Trip.find(filter).populate(POPULATE_USER).sort({ createdAt: -1 });
    return docs.map(formatTrip);
  },

  // ── getById ─────────────────────────────────────────────────────────────────
  getById: async (id) => {
    try {
      const doc = await Trip.findById(id).populate(POPULATE_USER);
      return doc ? formatTrip(doc) : null;
    } catch { return null; }
  },

  // ── getByUserId ─────────────────────────────────────────────────────────────
  getByUserId: async (userId) => {
    const docs = await Trip.find({ user_id: userId }).populate(POPULATE_USER).sort({ createdAt: -1 });
    return docs.map(formatTrip);
  },

  // ── getAllAdmin ──────────────────────────────────────────────────────────────
  getAllAdmin: async () => {
    const docs = await Trip.find().populate(POPULATE_USER).sort({ createdAt: -1 });
    return docs.map(formatTrip);
  },

  // ── create ──────────────────────────────────────────────────────────────────
  create: async (data) => {
    const spots = parseInt(data.spots) || 1;
    const doc   = await Trip.create({
      user_id:     data.userId,
      destination: data.destination,
      country:     data.country,
      dates:       data.dates,
      duration:    data.duration || "",
      spots,
      total_spots: spots,
      trip_type:   data.trip_type  || "Adventure",
      plan_type:   data.plan_type  || "moderate",
      description: data.description || "",
      tags:        Array.isArray(data.tags) ? data.tags : [],
      budget:      data.budget || "",
      gradient:    GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
    });
    return doc._id.toString();
  },

  // ── delete ──────────────────────────────────────────────────────────────────
  delete: async (id) => {
    await Trip.findByIdAndDelete(id);
    await JoinRequest.deleteMany({ trip_id: id });
  },

  // ── getUserIdByTripId ────────────────────────────────────────────────────────
  getUserIdByTripId: async (tripId) => {
    try {
      const doc = await Trip.findById(tripId, "user_id");
      return doc?.user_id?.toString() || null;
    } catch { return null; }
  },

  // ── createJoinRequest ───────────────────────────────────────────────────────
  createJoinRequest: async (tripId, requesterId) => {
    await JoinRequest.create({ trip_id: tripId, requester_id: requesterId });
    await Trip.findByIdAndUpdate(tripId, { $inc: { req_count: 1 } });
  },

  // ── getJoinRequests ─────────────────────────────────────────────────────────
  getJoinRequests: async (tripId) => {
    const docs = await JoinRequest.find({ trip_id: tripId })
      .populate({ path: "requester_id", select: "name email avatar color age bio" })
      .sort({ createdAt: -1 });

    return docs.map(doc => ({
      id:           doc._id.toString(),
      status:       doc.status,
      requested_on: doc.createdAt.toLocaleDateString("en-US", { month:"short", day:"2-digit" }),
      user_id:      doc.requester_id._id.toString(),
      name:         doc.requester_id.name,
      email:        doc.requester_id.email,
      avatar:       doc.requester_id.avatar,
      color:        doc.requester_id.color,
      age:          doc.requester_id.age,
      bio:          doc.requester_id.bio,
    }));
  },

  // ── updateJoinRequestStatus ─────────────────────────────────────────────────
  updateJoinRequestStatus: async (requestId, tripId, status) => {
    await JoinRequest.findOneAndUpdate(
      { _id: requestId, trip_id: tripId },
      { status }
    );
    if (status === "accepted") {
      await Trip.findByIdAndUpdate(tripId, { $inc: { spots: -1 } });
    }
  },

  // ── getMyRequests ────────────────────────────────────────────────────────────
  getMyRequests: async (userId) => {
    const docs = await JoinRequest.find({ requester_id: userId })
      .populate({ path: "trip_id", populate: { path: "user_id", select: "name" } })
      .sort({ createdAt: -1 });

    return docs.map(doc => ({
      id:           doc._id.toString(),
      status:       doc.status,
      requested_on: doc.createdAt.toLocaleDateString("en-US", { month:"short", day:"2-digit" }),
      trip_id:      doc.trip_id._id.toString(),
      destination:  doc.trip_id.destination,
      country:      doc.trip_id.country,
      dates:        doc.trip_id.dates,
      plan_type:    doc.trip_id.plan_type,
      host:         doc.trip_id.user_id?.name || "",
    }));
  },

  // ── hasRequested ────────────────────────────────────────────────────────────
  hasRequested: async (tripId, userId) => {
    const doc = await JoinRequest.findOne({ trip_id: tripId, requester_id: userId });
    return !!doc;
  },
};

module.exports = TripModel;
module.exports.Trip        = Trip;
module.exports.JoinRequest = JoinRequest;
