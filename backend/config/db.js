// config/db.js
// ─────────────────────────────────────────────────────────────────────────────
//  MongoDB connection using Mongoose
//
//  Mongoose is an ODM (Object Document Mapper) for MongoDB.
//  It adds schemas, validation, and a clean query API on top of the
//  native MongoDB driver.
//
//  We export the connect function — called once in server.js at startup.
//  After connecting, all models share the same connection automatically.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options silence deprecation warnings in Mongoose 8+
      serverSelectionTimeoutMS: 10000, // fail fast if Atlas is unreachable
    });
    console.log(`✅  MongoDB connected — ${conn.connection.host}`);
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err.message);
    console.error("   Check MONGO_URI in your .env file");
    process.exit(1); // crash on DB failure — nothing works without the DB
  }
};

module.exports = connectDB;
