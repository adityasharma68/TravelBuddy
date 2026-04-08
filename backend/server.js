// server.js
// ─────────────────────────────────────────────────────────────────────────────
//  Travel Buddy — Express Application Entry Point
//
//  Responsibilities:
//    1. Load environment variables
//    2. Create and configure Express app (middleware, CORS)
//    3. Mount route handlers
//    4. Auto-create MySQL tables on startup (no manual migration needed)
//    5. Seed demo data if the DB is empty
//    6. Start listening on PORT
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config(); // Load .env variables FIRST (other modules read them)

const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const db       = require("./config/db");

// ── Startup environment check ─────────────────────────────────────────────────
// Warn about missing keys on startup — but don't crash.
// The server can still run without GROQ_API_KEY; AI routes will return a clear
// error message when called instead of crashing at boot.
const REQUIRED_ENV = ["DB_HOST","DB_USER","DB_PASSWORD","DB_NAME","JWT_SECRET"];
const OPTIONAL_ENV = ["GROQ_API_KEY"];

const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing required environment variables: ${missing.join(", ")}`);
  console.error(`   Copy backend/.env.example to backend/.env and fill in the values.\n`);
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV.filter(k => !process.env[k]);
if (missingOptional.length) {
  console.warn(`\n⚠️   Optional env vars not set: ${missingOptional.join(", ")}`);
  console.warn(`   AI features will return an error until GROQ_API_KEY is added.`);
  console.warn(`   Get a free key at: https://console.groq.com\n`);
}

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());                    // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form-encoded bodies

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",  require("./routes/authRoutes"));
app.use("/api/trips", require("./routes/tripRoutes"));
app.use("/api/ai",    require("./routes/aiRoutes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use("/api/*", (req, res) =>
  res.status(404).json({ error: `Route ${req.originalUrl} not found.` })
);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Database Initialisation
//  Creates tables if they don't exist, then seeds demo data.
//  This runs once at startup — safe to run on every restart.
// ─────────────────────────────────────────────────────────────────────────────
async function initDB() {
  // ── Create tables ────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100)  NOT NULL,
      email       VARCHAR(150)  NOT NULL UNIQUE,
      password    VARCHAR(255)  NOT NULL,
      role        ENUM('user','admin') DEFAULT 'user',
      age         INT           DEFAULT 25,
      bio         TEXT,
      status      ENUM('active','suspended') DEFAULT 'active',
      avatar      VARCHAR(10),
      color       VARCHAR(20)   DEFAULT '#1a3d2b',
      trips_count INT           DEFAULT 0,
      created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS trips (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT           NOT NULL,
      destination VARCHAR(100)  NOT NULL,
      country     VARCHAR(100)  NOT NULL,
      dates       VARCHAR(100)  NOT NULL,
      duration    VARCHAR(50),
      spots       INT           DEFAULT 1,
      total_spots INT           DEFAULT 1,
      trip_type   ENUM('Adventure','Cultural','Leisure') DEFAULT 'Adventure',
      plan_type   ENUM('luxury','moderate','budget')     DEFAULT 'moderate',
      description TEXT,
      tags        JSON,
      budget      VARCHAR(50),
      gradient    VARCHAR(200),
      req_count   INT           DEFAULT 0,
      created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS join_requests (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      trip_id      INT NOT NULL,
      requester_id INT NOT NULL,
      status       ENUM('pending','accepted','declined') DEFAULT 'pending',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_req (trip_id, requester_id),
      FOREIGN KEY (trip_id)      REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log("✅  Database tables ready");

  // ── Seed demo data (only if DB is empty) ─────────────────────────────────
  const [[{ c }]] = await db.query("SELECT COUNT(*) AS c FROM users");
  if (c > 0) return; // Already seeded — skip

  console.log("🌱  Seeding demo data...");

  // Admin account
  const adminPw = await bcrypt.hash("Admin@123", 10);
  await db.query(
    "INSERT INTO users (name,email,password,role,age,bio,avatar,color) VALUES (?,?,?,?,?,?,?,?)",
    ["Super Admin","admin@travelbuddy.com",adminPw,"admin",30,"Platform administrator","SA","#1a3d2b"]
  );

  // Regular users
  const userPw = await bcrypt.hash("pass123", 10);
  const demoUsers = [
    ["Priya Mehta",  "priya@example.com",  26,"Solo traveler & photography lover",   "PM","#c8587a"],
    ["Rahul Sharma", "rahul@example.com",  29,"Mountain trekking enthusiast",        "RS","#2e6b8a"],
    ["Ananya Singh", "ananya@example.com", 24,"Budget backpacker | 30+ countries",   "AS","#d4720e"],
    ["Vikram Nair",  "vikram@example.com", 32,"Foodie & cultural explorer",          "VN","#4a7c3f"],
    ["Zara Khan",    "zara@example.com",   27,"Luxury travel & wellness",            "ZK","#6b4c1a"],
  ];
  const userIds = {};
  for (const [name, email, age, bio, av, col] of demoUsers) {
    const [r] = await db.query(
      "INSERT INTO users (name,email,password,age,bio,avatar,color) VALUES (?,?,?,?,?,?,?)",
      [name, email, userPw, age, bio, av, col]
    );
    userIds[av] = r.insertId;
  }
  // Suspend Vikram for demo
  await db.query("UPDATE users SET status='suspended' WHERE avatar='VN'");

  // Demo trips
  const GRADS = {
    pink:  "linear-gradient(135deg,#c8587a,#6e3b5b)",
    blue:  "linear-gradient(135deg,#2e6b8a,#1a3c52)",
    green: "linear-gradient(135deg,#1a6b4a,#0d3d28)",
    cyan:  "linear-gradient(135deg,#1a6b8a,#0d3d52)",
    navy:  "linear-gradient(135deg,#2e6bb0,#1a3c6e)",
    brown: "linear-gradient(135deg,#6b4c1a,#3d2a0a)",
    dark:  "linear-gradient(135deg,#1a4a6b,#0d2a3d)",
    rust:  "linear-gradient(135deg,#8a3a1a,#4d1f0a)",
  };
  const trips = [
    { uid:"PM", dest:"Kyoto",     country:"Japan",     dates:"Apr 10–20",    dur:"10 days", spots:2,total:3, type:"Cultural",  plan:"moderate",desc:"Temple hopping, tea ceremonies, bamboo forests. Looking for slow travel companions.", tags:["Photography","Culture","Vegetarian"],      budget:"₹65,000",   grad:GRADS.pink,  req:4 },
    { uid:"RS", dest:"Patagonia", country:"Chile",     dates:"Nov 5–22",     dur:"17 days", spots:1,total:2, type:"Adventure", plan:"luxury",  desc:"Torres del Paine W-Trek, Los Glaciares. Need a fit companion for daily 15–20km hikes.", tags:["Hiking","Camping","Adventure"],       budget:"₹1,20,000", grad:GRADS.blue,  req:7 },
    { uid:"AS", dest:"Bali",      country:"Indonesia", dates:"May 1–12",     dur:"11 days", spots:3,total:4, type:"Leisure",   plan:"budget",  desc:"Yoga retreats, surfing lessons, rice terraces. Very chill vibes, very friendly crowd.", tags:["Wellness","Surfing","Budget"],        budget:"₹38,000",   grad:GRADS.green, req:12 },
    { uid:"ZK", dest:"Maldives",  country:"Maldives",  dates:"Jun 5–12",     dur:"7 days",  spots:1,total:2, type:"Leisure",   plan:"luxury",  desc:"Overwater bungalows, private beaches, scuba diving, golden sunsets every evening.", tags:["Luxury","Diving","Romance"],          budget:"₹2,50,000", grad:GRADS.cyan,  req:9 },
    { uid:"PM", dest:"Santorini", country:"Greece",    dates:"Jun 20–Jul 1", dur:"11 days", spots:1,total:2, type:"Leisure",   plan:"luxury",  desc:"Island hopping, sunset chasing, fresh seafood, ancient ruins.", tags:["Sunsets","Food","History"],           budget:"₹95,000",   grad:GRADS.navy,  req:8 },
    { uid:"AS", dest:"Bangkok",   country:"Thailand",  dates:"Aug 10–18",    dur:"8 days",  spots:2,total:3, type:"Cultural",  plan:"budget",  desc:"Street food paradise, Wat Pho at dawn, floating markets, night bazaars.", tags:["Street food","Culture","Temples"],    budget:"₹28,000",   grad:GRADS.brown, req:14 },
    { uid:"RS", dest:"Iceland",   country:"Iceland",   dates:"Sep 15–25",    dur:"10 days", spots:2,total:3, type:"Adventure", plan:"moderate",desc:"Northern Lights, geysers, waterfalls, glacial hikes. Must be comfortable in cold!", tags:["Northern Lights","Hiking","Nature"],  budget:"₹85,000",   grad:GRADS.dark,  req:6 },
    { uid:"PM", dest:"Marrakech", country:"Morocco",   dates:"Oct 3–10",     dur:"7 days",  spots:2,total:4, type:"Cultural",  plan:"budget",  desc:"Medina maze, souks, riads, Jemaa el-Fna food stalls. Rich culture, vibrant streets.", tags:["Culture","Food","Architecture"],     budget:"₹32,000",   grad:GRADS.rust,  req:5 },
  ];
  for (const t of trips) {
    await db.query(
      `INSERT INTO trips (user_id,destination,country,dates,duration,spots,total_spots,trip_type,plan_type,description,tags,budget,gradient,req_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [userIds[t.uid], t.dest, t.country, t.dates, t.dur, t.spots, t.total, t.type, t.plan, t.desc, JSON.stringify(t.tags), t.budget, t.grad, t.req]
    );
    await db.query("UPDATE users SET trips_count = trips_count + 1 WHERE id=?", [userIds[t.uid]]);
  }

  console.log("✅  Demo data seeded!");
}

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀  Travel Buddy API  →  http://localhost:${PORT}`);
      console.log(`🔑  Admin login       →  admin@travelbuddy.com / Admin@123`);
      console.log(`👤  Demo user         →  priya@example.com / pass123\n`);
    });
  })
  .catch(err => {
    console.error("❌  Failed to initialise database:", err.message);
    process.exit(1);
  });
