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

import twilio from "twilio";

const { twiml: { VoiceResponse } } = twilio;

// Simple in-memory history per call
const callSessions = new Map();

// Twilio sends callSid each time for this call
function getHistoryForCall(callSid) {
  return callSessions.get(callSid) || [];
}

function setHistoryForCall(callSid, history) {
  callSessions.set(callSid, history);
}

// First & subsequent requests from Twilio
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  const speech = req.body.SpeechResult; // Twilio speech-to-text
  const isNewCall = !speech; // first hit has no SpeechResult

  // On very first request: greet & ask first question
  if (isNewCall) {
    twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST"
    }).say(
      "Hi, you’ve reached the AI receptionist. How can I help you today?"
    );
    return res.type("text/xml").send(twiml.toString());
  }

  try {
    // Get existing conversation history for this call
    const history = getHistoryForCall(callSid);

    // Call your existing receptionist logic
    const aiResult = await handleReceptionistTurn(history, speech);

    const { next_message_to_customer, booking, escalation } = aiResult;

    // Update session history (you can store the JSON if you like)
    history.push({ role: "user", content: speech });
    history.push({ role: "assistant", content: JSON.stringify(aiResult) });
    setHistoryForCall(callSid, history);

    // Handle escalation
    if (escalation?.escalate_to_human) {
      // Option 1: live transfer
      const dial = twiml.dial();
      dial.number(process.env.HUMAN_FALLBACK_NUMBER); // your mobile

      // You can also send yourself an SMS/email with the booking JSON here

      return res.type("text/xml").send(twiml.toString());
    }

    // If booking complete: confirm & end call
    if (booking?.complete) {
      const gather = twiml.gather({
        input: "speech",
        timeout: 2,
        numDigits: 1,
        action: "/twilio/voice",
        method: "POST"
      });

      gather.say(
        `Thanks ${booking.name || ""}. I’ve recorded your ${
          booking.job_type || "job"
        } at ${booking.location || "your address"}. ` +
        `We’ll get back to you about ${
          booking.preferred_time || "a suitable time"
        }. If you need anything else, you can say it now.`
      );

      // Optionally send SMS confirmation
      // await sendConfirmationSMS(booking);

      return res.type("text/xml").send(twiml.toString());
    }

    // Normal conversation: ask the next question
    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST"
    });
    gather.say(next_message_to_customer || "Sorry, can you say that again?");

    return res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("Twilio voice error:", err);
    twiml.say("Sorry, something went wrong. We’ll call you back.");
    return res.type("text/xml").send(twiml.toString());
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Receptionist running on port ${port}`));
