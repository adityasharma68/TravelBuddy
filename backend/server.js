// server.js
// ─────────────────────────────────────────────────────────────────────────────
//  Travel Buddy — Express Application Entry Point (MongoDB / Mongoose)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const morgan    = require("morgan");
const bcrypt    = require("bcryptjs");
const connectDB = require("./config/db");  // wraps mongoose.connect

// ── Required env check ────────────────────────────────────────────────────────
const REQUIRED = ["MONGO_URI", "JWT_SECRET"];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n❌  Missing required env vars: ${missing.join(", ")}`);
  console.error("   Copy backend/.env.example → backend/.env and fill in values.\n");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️   GROQ_API_KEY not set — AI features will return errors until added.");
}

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",   require("./routes/authRoutes"));
app.use("/api/trips",  require("./routes/tripRoutes"));
app.use("/api/ai",     require("./routes/aiRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", db: "mongodb", time: new Date().toISOString() })
);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use("/api/*", (req, res) =>
  res.status(404).json({ error: `Route ${req.originalUrl} not found.` })
);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Seed demo data (only if DB is empty)
// ─────────────────────────────────────────────────────────────────────────────
async function seedDemoData() {
  const { User }   = require("./models/userModel");
  const { Trip }   = require("./models/tripModel");

  const count = await User.countDocuments();
  if (count > 0) return; // already seeded

  console.log("🌱  Seeding demo data...");

  const adminPw = await bcrypt.hash("Admin@123", 10);
  await User.create({
    name:"Super Admin", email:"admin@travelbuddy.com",
    password:adminPw, role:"admin", age:30,
    bio:"Platform administrator", avatar:"SA", color:"#1a3d2b",
  });

  const userPw = await bcrypt.hash("pass123", 10);
  const DEMO_USERS = [
    ["Priya Mehta",  "priya@example.com",  26,"Solo traveler & photography lover","PM","#c8587a"],
    ["Rahul Sharma", "rahul@example.com",  29,"Mountain trekking enthusiast",     "RS","#2e6b8a"],
    ["Ananya Singh", "ananya@example.com", 24,"Budget backpacker | 30+ countries","AS","#d4720e"],
    ["Vikram Nair",  "vikram@example.com", 32,"Foodie & cultural explorer",       "VN","#4a7c3f"],
    ["Zara Khan",    "zara@example.com",   27,"Luxury travel & wellness",         "ZK","#6b4c1a"],
  ];

  const userMap = {};
  for (const [name, email, age, bio, av, color] of DEMO_USERS) {
    const u = await User.create({ name, email, password:userPw, age, bio, avatar:av, color });
    userMap[av] = u._id;
  }
  await User.findOneAndUpdate({ avatar:"VN" }, { status:"suspended" });

  const GRADS = {
    pink:"linear-gradient(135deg,#c8587a,#6e3b5b)",
    blue:"linear-gradient(135deg,#2e6b8a,#1a3c52)",
    green:"linear-gradient(135deg,#1a6b4a,#0d3d28)",
    cyan:"linear-gradient(135deg,#1a6b8a,#0d3d52)",
    navy:"linear-gradient(135deg,#2e6bb0,#1a3c6e)",
    brown:"linear-gradient(135deg,#6b4c1a,#3d2a0a)",
    dark:"linear-gradient(135deg,#1a4a6b,#0d2a3d)",
    rust:"linear-gradient(135deg,#8a3a1a,#4d1f0a)",
  };

  const TRIPS = [
    {av:"PM",dest:"Kyoto",    country:"Japan",    dates:"Apr 10–20",   dur:"10 days",spots:2,tot:3,type:"Cultural", plan:"moderate",desc:"Temple hopping, tea ceremonies, bamboo forests.",            tags:["Photography","Culture","Vegetarian"],   budget:"₹65,000",   grad:GRADS.pink,  req:4},
    {av:"RS",dest:"Patagonia",country:"Chile",    dates:"Nov 5–22",    dur:"17 days",spots:1,tot:2,type:"Adventure",plan:"luxury",  desc:"Torres del Paine W-Trek, Los Glaciares.",                   tags:["Hiking","Camping","Adventure"],         budget:"₹1,20,000", grad:GRADS.blue,  req:7},
    {av:"AS",dest:"Bali",     country:"Indonesia",dates:"May 1–12",    dur:"11 days",spots:3,tot:4,type:"Leisure",  plan:"budget",  desc:"Yoga retreats, surfing lessons, rice terraces.",             tags:["Wellness","Surfing","Budget"],          budget:"₹38,000",   grad:GRADS.green, req:12},
    {av:"ZK",dest:"Maldives", country:"Maldives", dates:"Jun 5–12",    dur:"7 days", spots:1,tot:2,type:"Leisure",  plan:"luxury",  desc:"Overwater bungalows, private beaches, scuba diving.",       tags:["Luxury","Diving","Romance"],            budget:"₹2,50,000", grad:GRADS.cyan,  req:9},
    {av:"PM",dest:"Santorini",country:"Greece",   dates:"Jun 20–Jul 1",dur:"11 days",spots:1,tot:2,type:"Leisure",  plan:"luxury",  desc:"Island hopping, sunset chasing, fresh seafood.",            tags:["Sunsets","Food","History"],             budget:"₹95,000",   grad:GRADS.navy,  req:8},
    {av:"AS",dest:"Bangkok",  country:"Thailand", dates:"Aug 10–18",   dur:"8 days", spots:2,tot:3,type:"Cultural", plan:"budget",  desc:"Street food paradise, Wat Pho at dawn, floating markets.",  tags:["Street food","Culture","Temples"],      budget:"₹28,000",   grad:GRADS.brown, req:14},
    {av:"RS",dest:"Iceland",  country:"Iceland",  dates:"Sep 15–25",   dur:"10 days",spots:2,tot:3,type:"Adventure",plan:"moderate",desc:"Northern Lights, geysers, waterfalls, glacial hikes.",      tags:["Northern Lights","Hiking","Nature"],    budget:"₹85,000",   grad:GRADS.dark,  req:6},
    {av:"PM",dest:"Marrakech",country:"Morocco",  dates:"Oct 3–10",    dur:"7 days", spots:2,tot:4,type:"Cultural", plan:"budget",  desc:"Medina maze, souks, riads, Jemaa el-Fna food stalls.",     tags:["Culture","Food","Architecture"],        budget:"₹32,000",   grad:GRADS.rust,  req:5},
  ];

  for (const t of TRIPS) {
    await Trip.create({
      user_id:t.av?userMap[t.av]:null, destination:t.dest, country:t.country,
      dates:t.dates, duration:t.dur, spots:t.spots, total_spots:t.tot,
      trip_type:t.type, plan_type:t.plan, description:t.desc,
      tags:t.tags, budget:t.budget, gradient:t.grad, req_count:t.req,
    });
    await User.findByIdAndUpdate(userMap[t.av], { $inc:{trips_count:1} });
  }

  console.log("✅  Demo data seeded!");
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(seedDemoData)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀  Travel Buddy API  →  http://localhost:${PORT}`);
      console.log(`🍃  Database         →  MongoDB Atlas`);
      console.log(`🔑  Admin login      →  admin@travelbuddy.com / Admin@123`);
      console.log(`👤  Demo user        →  priya@example.com / pass123\n`);
    });
  })
  .catch(err => {
    console.error("❌  Startup failed:", err.message);
    process.exit(1);
  });
