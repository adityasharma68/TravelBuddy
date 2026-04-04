// controllers/aiController.js
// ─────────────────────────────────────────────────────────────────────────────
//  AI Controller — Groq-powered travel intelligence
//
//  Uses the Groq SDK with llama-3.3-70b-versatile model.
//  Groq is used because it offers very fast inference (great for chat UX)
//  and has a generous free tier — perfect for development.
//
//  Endpoints:
//    POST /api/ai/chat   → multi-turn AI assistant (4 specialist modes)
//    POST /api/ai/plan   → one-shot itinerary + cost generator
// ─────────────────────────────────────────────────────────────────────────────

const Groq = require("groq-sdk");

// ── Lazy Groq client ───────────────────────────────────────────────────────────
// We do NOT instantiate at module load time because the module is required before
// dotenv has run (or the key may genuinely be missing in dev).
// Instead, getGroq() creates the client on first use and caches it.
let _groq = null;

function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to backend/.env and restart the server.\n" +
      "Get a free key at: https://console.groq.com"
    );
  }
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// ── System Prompts ─────────────────────────────────────────────────────────────
// Each mode gives the AI a distinct personality/focus for that conversation.
const SYSTEM_PROMPTS = {
  // Companion Matcher: helps find a compatible travel buddy
  companion: `You are a travel companion matching assistant for Travel Buddy — a platform that connects solo travelers. 
Your job is to help users identify the ideal travel companion based on their trip preferences, travel style, interests, age, and budget. 
Ask targeted questions about destination, travel dates, pace (relaxed/intense), interests (food, photography, adventure, culture, etc.), and what personality traits they want in a companion.
Provide specific, actionable advice. Keep responses concise, friendly, and under 200 words.`,

  // Trip Planner: detailed day-by-day itinerary builder
  planner: `You are an expert travel planner specializing in personalized itineraries.
Create detailed day-by-day plans with top attractions, hidden gems, local tips, and practical logistics.
When the user provides destination + duration + interests + budget, structure the plan as:
Day 1, Day 2, etc. with morning/afternoon/evening slots.
Include realistic travel times, opening hours tips, and insider advice. Keep responses practical and under 250 words per message.`,

  // Cost Estimator: budget breakdown specialist
  cost: `You are a travel cost estimation expert. Provide detailed budget breakdowns in Indian Rupees (₹).
Always include: ✈️ Flights, 🏨 Accommodation, 🍽️ Food, 🚌 Local Transport, 🎯 Activities & Entry Fees, 💊 Misc (insurance, SIM, tips).
Ask for: origin city, destination, duration, number of travelers, and budget tier (luxury/moderate/budget).
Present a clear table-style breakdown with min–max ranges. Keep it practical and actionable.`,

  // Stay & Eat Guide: curated local recommendations
  places: `You are a hospitality and dining expert with deep knowledge of global destinations.
Recommend the best places to stay and eat at any destination, tailored to the user's budget tier.
For hotels: include 3 options (luxury/mid-range/budget) with price range in ₹ per night and highlights.
For restaurants: split into breakfast spots, lunch spots, and dinner/evening options.
Name actual establishments where possible. Keep responses specific and under 220 words.`,
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/chat
//  Body: { mode: "companion" | "planner" | "cost" | "places", messages: [{role, content}] }
//
//  Supports multi-turn conversation — the full message history is sent each
//  time so the AI has context from earlier in the chat.
// ─────────────────────────────────────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { mode, messages } = req.body;

    // Validate
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required." });
    }

    // Pick the appropriate system prompt (default to planner if mode is unknown)
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.planner;

    // Call Groq API
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile", // Fast & powerful Groq-hosted model
      max_tokens: 700,
      temperature: 0.7,  // Balanced creativity vs consistency
      messages: [
        { role: "system",    content: systemPrompt },
        // Map our message format to Groq's expected format
        ...messages.map(m => ({
          role:    m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      ],
    });

    const text = completion.choices[0]?.message?.content || "No response.";
    res.json({ text });
  } catch (err) {
    console.error("AI chat error:", err.message);
    // Return a graceful error instead of crashing
    res.status(500).json({ error: "AI service unavailable. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/ai/plan
//  Body: { from, destination, days, plan_type }
//
//  One-shot call that generates a complete travel plan with budget breakdown.
//  Returns a detailed markdown-style text block.
// ─────────────────────────────────────────────────────────────────────────────
const generatePlan = async (req, res) => {
  try {
    const { from, destination, days, plan_type } = req.body;

    if (!destination) {
      return res.status(400).json({ error: "Destination is required." });
    }

    // Map plan type to descriptive label for the prompt
    const planLabel = { luxury: "Luxury (5-star)", moderate: "Moderate (3-4 star)", budget: "Budget (hostels/guesthouses)" }[plan_type] || "Moderate";

    // Build a structured prompt for a complete travel plan
    const prompt = `Create a complete ${planLabel} travel plan for a trip from ${from || "India"} to ${destination} for ${days || 7} days.

Structure your response with these exact sections:
📋 TRIP OVERVIEW — destination highlights, best season, ideal for
💸 BUDGET BREAKDOWN — itemized costs in ₹ (flights, hotel, food, transport, activities, misc), total estimate
🏨 WHERE TO STAY — 3 hotel recommendations with price/night in ₹ and 1-line highlight  
🍽️ WHERE TO EAT — 3 must-try restaurants/food experiences with price range
🎯 TOP ACTIVITIES — 5 activities with entry fees in ₹
✈️ GETTING THERE — flight cost from ${from || "major Indian city"}, best booking tips
💡 INSIDER TIPS — 3 practical tips specific to ${destination}

Keep each section concise but specific. Use real place names.`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You are a professional travel consultant who creates detailed, actionable travel plans with real place names and accurate cost estimates in Indian Rupees (₹). Be specific, practical, and inspiring.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content || "Plan generation failed.";
    res.json({ text });
  } catch (err) {
    console.error("generatePlan error:", err.message);
    res.status(500).json({ error: "Could not generate plan. Please try again." });
  }
};

module.exports = { chat, generatePlan };
