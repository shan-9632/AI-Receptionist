import express from "express";
import dotenv from "dotenv";
import { handleReceptionistTurn } from "./receptionistLogic.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // <– for Twilio webhooks
app.use(cors());

// TEMP in-memory storage — replace with Redis or DB if needed
const sessions = new Map();

/**
 * POST /receptionist
 * body: { sessionId: string, userMessage: string }
 */
app.post("/receptionist", async (req, res) => {
  const { sessionId, userMessage } = req.body;

  if (!sessionId || !userMessage) {
    return res.status(400).json({ error: "Missing sessionId or userMessage" });
  }

  const history = sessions.get(sessionId) || [];

  try {
    const result = await handleReceptionistTurn(history, userMessage);

    // Save conversation history
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: JSON.stringify(result) });
    sessions.set(sessionId, history);

    return res.json(result);
  } catch (err) {
    console.error("AI receptionist error:", err);
    return res.status(500).json({ error: "AI receptionist failed." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Receptionist running on port ${port}`));
