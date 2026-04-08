// config/db.js
// ─────────────────────────────────────────────────────────────────────────────
//  MySQL Connection Pool
//  We use a connection pool (not a single connection) so that multiple
//  simultaneous requests can each grab a connection from the pool rather
//  than waiting for one connection to be free.
// ─────────────────────────────────────────────────────────────────────────────

const mysql = require("mysql2");
require("dotenv").config();

// Create a pool of reusable MySQL connections
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "travel_buddy",

  // Pool settings
  waitForConnections: true,   // Queue requests when all connections are busy
  connectionLimit:    10,     // Max 10 simultaneous connections
  queueLimit:         0,      // Unlimited queue (0 = no limit)
});

// Expose the promise-based interface so we can use async/await
const db = pool.promise();

// Test the connection when the server starts
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌  MySQL connection failed:", err.message);
    return;
  }
  console.log("✅  MySQL connected successfully");
  connection.release(); // Always release the connection back to the pool
});

module.exports = db;
