// routes/aiRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  AI Routes — /api/ai
//  All routes are protected — only logged-in users can use the AI features.
// ─────────────────────────────────────────────────────────────────────────────

const express  = require("express");
const { chat, generatePlan } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/ai/chat  → multi-turn AI assistant
router.post("/chat", protect, chat);

// POST /api/ai/plan  → one-shot travel plan generator
router.post("/plan", protect, generatePlan);

module.exports = router;
