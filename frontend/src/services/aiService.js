// src/services/aiService.js
// ─────────────────────────────────────────────────────────────────────────────
//  AI Service — Calls the Groq-powered endpoints on our Express backend
// ─────────────────────────────────────────────────────────────────────────────

import { api } from "./authService";

/**
 * Send a multi-turn chat message to the AI assistant.
 * @param {{ mode: string, messages: Array<{role, content}> }} data
 * @returns {{ text: string }}
 */
export const sendAIChat = (data) => api.post("/ai/chat", data);

/**
 * Generate a complete one-shot travel plan.
 * @param {{ from: string, destination: string, days: string|number, plan_type: string }} data
 * @returns {{ text: string }}
 */
export const generateAIPlan = (data) => api.post("/ai/plan", data);
