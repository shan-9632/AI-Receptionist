// src/server.js

import express from "express";
import cors from "cors";
import { handleReceptionistTurn } from "./receptionistLogic.js";

const app = express();

app.use(express.json());
app.use(cors());

// In-memory conversation history per sessionId (for web / API usage)
const sessions = new Map();

/**
 * POST /receptionist
 * JSON body:
 * {
 *   "sessionId": "unique-id-per-caller-or-browser",
 *   "userMessage": "what the user said",
 *   "history": [optional prior messages, rarely needed from client]
 * }
 *
 * This is your main API endpoint that Replit already runs.
 * You can hit this from web frontend, testing tools, or later via telephony.
 */
app.post("/receptionist", async (req, res) => {
  try {
    const { sessionId, userMessage } = req.body;

    if (!sessionId || !userMessage) {
      return res
        .status(400)
        .json({ error: "sessionId and userMessage are required" });
    }

    const history = sessions.get(sessionId) || [];

    const aiResult = await handleReceptionistTurn(history, userMessage);

    // Save history (we store just user + assistant JSON text for now)
    history.push({ role: "user", content: userMessage });
    history.push({
      role: "assistant",
      content: JSON.stringify(aiResult),
    });
    sessions.set(sessionId, history);

    return res.json(aiResult);
  } catch (err) {
    console.error("Error in /receptionist:", err);
    return res.status(500).json({ error: "AI receptionist error" });
  }
});

/**
 * PLACEHOLDER VOICE / CALL ROUTES
 *
 * These are stubs where we will later plug in Telnyx / Twilio / Vonage.
 * Right now, they just return 501 so nothing breaks if they’re hit.
 *
 * Later:
 * - /call/answer      -> initial call answer, greet & start AI flow
 * - /call/continue    -> carrier webhook for subsequent speech/text
 * - /call/after-transfer -> carrier tells us if human answered or was busy
 * - /call/take-message   -> capture message if mechanic is too busy
 */

app.post("/call/answer", (req, res) => {
  return res
    .status(501)
    .json({ error: "call/answer not wired to a carrier yet." });
});

app.post("/call/continue", (req, res) => {
  return res
    .status(501)
    .json({ error: "call/continue not wired to a carrier yet." });
});

app.post("/call/after-transfer", (req, res) => {
  return res
    .status(501)
    .json({ error: "call/after-transfer not wired to a carrier yet." });
});

app.post("/call/take-message", (req, res) => {
  return res
    .status(501)
    .json({ error: "call/take-message not wired to a carrier yet." });
});

// Start server (Replit respects process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sammies Automotive AI Receptionist running on port ${PORT}`);
});
