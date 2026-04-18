// models/userModel.js
// ─────────────────────────────────────────────────────────────────────────────
//  User Model — Mongoose Schema + all user-related DB operations
//
//  MongoDB stores documents in collections (like rows in a table).
//  Mongoose adds a schema so each document has a defined shape.
//
//  Key difference from SQL version:
//    • No manual SQL — Mongoose methods replace raw queries
//    • _id is auto-generated (ObjectId), we add a virtual .id getter
//    • No separate JOIN — user info is embedded or referenced
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

// ── Schema definition ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, default: null },       // null for Google-only accounts
    role:          { type: String, enum: ["user","admin"], default: "user" },
    age:           { type: Number, default: 25 },
    bio:           { type: String, default: "" },
    status:        { type: String, enum: ["active","suspended"], default: "active" },
    avatar:        { type: String, default: "" },          // 2-letter initials
    color:         { type: String, default: "#1a3d2b" },   // avatar background colour
    avatar_url:    { type: String, default: null },         // Cloudinary URL
    google_id:     { type: String, default: null, unique: true, sparse: true },
    reset_token:   { type: String, default: null },         // hashed OTP
    reset_expires: { type: Date,   default: null },
    trips_count:   { type: Number, default: 0 },
  },
  {
    timestamps: true,    // adds createdAt and updatedAt automatically
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

// ── Virtual: format joined date like MySQL DATE_FORMAT ────────────────────────
userSchema.virtual("joined").get(function () {
  return this.createdAt
    ? this.createdAt.toLocaleDateString("en-US", { month:"short", day:"2-digit", year:"numeric" })
    : "";
});

// ── Virtual: has_google flag used by frontend ─────────────────────────────────
userSchema.virtual("has_google").get(function () {
  return !!this.google_id;
});

const User = mongoose.model("User", userSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: convert a Mongoose document to a safe plain object
//  Removes password and internal fields before sending to the client.
// ─────────────────────────────────────────────────────────────────────────────
const toSafe = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  delete obj.reset_token;
  delete obj.reset_expires;
  delete obj.__v;
  // Normalise _id → id so the frontend doesn't need to change
  obj.id = obj._id.toString();
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
//  UserModel — same public interface as the old SQL model
//  Controllers call these methods and receive plain objects (not Mongoose docs).
// ─────────────────────────────────────────────────────────────────────────────
const UserModel = {

  findByEmail: async (email) => {
    const doc = await User.findOne({ email: email.toLowerCase().trim() });
    return doc || null;  // return raw doc so password hash is accessible
  },

  findById: async (id) => {
    try {
      const doc = await User.findById(id);
      return toSafe(doc);
    } catch { return null; }
  },

  findByGoogleId: async (googleId) => {
    return await User.findOne({ google_id: googleId }) || null;
  },

  create: async ({ name, email, password, age, bio, avatar, color, googleId, avatarUrl }) => {
    const doc = await User.create({
      name, email, password: password || null,
      age: parseInt(age) || 25,
      bio: bio || "",
      avatar, color,
      google_id: googleId  || undefined,
      avatar_url: avatarUrl || undefined,
    });
    return doc._id.toString();
  },

  linkGoogleId: async (userId, googleId, avatarUrl) => {
    await User.findByIdAndUpdate(userId, {
      google_id:  googleId,
      $set: { avatar_url: avatarUrl },
    }, { new: false });
  },

  getAll: async () => {
    const docs = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 });
    return docs.map(toSafe);
  },

  getStats: async () => {
    const [total, active, suspended, tripAgg] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", status: "active" }),
      User.countDocuments({ role: "user", status: "suspended" }),
      // Import Trip model lazily to avoid circular-require issues
      mongoose.model("Trip").countDocuments(),
    ]);
    const reqAgg = await mongoose.model("Trip").aggregate([
      { $group: { _id: null, total: { $sum: "$req_count" } } }
    ]);
    return {
      totalUsers: total,
      activeUsers: active,
      suspended,
      totalTrips: tripAgg,
      totalRequests: reqAgg[0]?.total || 0,
    };
  },

  // Admin: update any field
  update: async (id, { name, email, age, bio, status, avatar }) => {
    await User.findByIdAndUpdate(id, { name: name.trim(), email: email.toLowerCase(), age, bio, status, avatar });
  },

  updateStatus: async (id, status) => {
    await User.findByIdAndUpdate(id, { status });
  },

  updateProfile: async (id, { name, age, bio, avatar }) => {
    await User.findByIdAndUpdate(id, { name: name.trim(), age, bio, avatar });
  },

  updateAvatar: async (id, avatarUrl) => {
    await User.findByIdAndUpdate(id, { avatar_url: avatarUrl });
  },

  updatePassword: async (id, hashedPassword) => {
    await User.findByIdAndUpdate(id, { password: hashedPassword });
  },

  saveResetToken: async (email, hashedToken, expiresAt) => {
    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { reset_token: hashedToken, reset_expires: expiresAt }
    );
  },

  findByResetToken: async (email) => {
    return await User.findOne({
      email:          email.toLowerCase(),
      reset_expires:  { $gt: new Date() },
    }) || null;
  },

  clearResetToken: async (id) => {
    await User.findByIdAndUpdate(id, { reset_token: null, reset_expires: null });
  },

  delete: async (id) => {
    await User.findOneAndDelete({ _id: id, role: { $ne: "admin" } });
  },

  incrementTripCount: async (id) => {
    await User.findByIdAndUpdate(id, { $inc: { trips_count: 1 } });
  },

  decrementTripCount: async (id) => {
    await User.findByIdAndUpdate(id, { $inc: { trips_count: -1 } });
  },
};

module.exports = UserModel;
module.exports.User = User;      // export raw model for seeding
module.exports.toSafe = toSafe;
