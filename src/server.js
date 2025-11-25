// src/server.js

import express from "express";
import cors from "cors";
import twilioPkg from "twilio";
import { handleReceptionistTurn } from "./receptionistLogic.js";

const app = express();

// Twilio setup
const {
  twiml: { VoiceResponse },
} = twilioPkg;

const smsClient = twilioPkg(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // for Twilio webhooks
app.use(cors());

// In-memory conversation history for web/API sessions
const sessions = new Map();

// In-memory conversation history for each phone call (by CallSid)
const callSessions = new Map();

function getCallHistory(callSid) {
  return callSessions.get(callSid) || [];
}

function setCallHistory(callSid, history) {
  callSessions.set(callSid, history);
}

/**
 * Send SMS confirmation to customer and alert to owner.
 */
async function sendConfirmationMessages(booking) {
  try {
    if (!booking?.phone) return;
    if (!process.env.TWILIO_SMS_FROM) {
      console.warn("TWILIO_SMS_FROM not set, not sending SMS.");
      return;
    }

    const from = process.env.TWILIO_SMS_FROM;

    const customerBody =
      `Hi ${booking.name || ""}, thanks for booking with Sammies Automotive.\n` +
      `Service: ${booking.job_type || "mechanic service"}\n` +
      (booking.vehicle_make || booking.vehicle_model
        ? `Vehicle: ${booking.vehicle_year || ""} ${booking.vehicle_make || ""} ${booking.vehicle_model || ""}\n`
        : "") +
      (booking.registration ? `Rego: ${booking.registration}\n` : "") +
      (booking.preferred_time
        ? `Preferred time: ${booking.preferred_time}\n`
        : "") +
      (booking.location ? `Location: ${booking.location}\n` : "") +
      `We’ll be in touch to confirm the exact time.`;

    await smsClient.messages.create({
      from,
      to: booking.phone,
      body: customerBody,
    });

    if (process.env.OWNER_MOBILE) {
      const ownerBody =
        `NEW BOOKING - Sammies Automotive\n` +
        `Name: ${booking.name || "-"}\n` +
        `Phone: ${booking.phone || "-"}\n` +
        `Service: ${booking.job_type || "-"}\n` +
        `Vehicle: ${booking.vehicle_year || ""} ${booking.vehicle_make || ""} ${booking.vehicle_model || ""}\n` +
        `Rego: ${booking.registration || "-"}\n` +
        `VIN: ${booking.vin || "-"}\n` +
        `Odometer: ${booking.odometer_km || "-"} km\n` +
        `Location: ${booking.location || "-"}\n` +
        `Urgency: ${booking.urgency || "-"}\n` +
        `Preferred time: ${booking.preferred_time || "-"}\n` +
        `Desc: ${booking.description || "-"}`;

      await smsClient.messages.create({
        from,
        to: process.env.OWNER_MOBILE,
        body: ownerBody,
      });
    }
  } catch (err) {
    console.error("Failed to send confirmation SMS:", err);
  }
}

/**
 * -------- JSON API endpoint (for web or testing) --------
 * POST /receptionist
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

    history.push({ role: "user", content: userMessage });
    history.push({
      role: "assistant",
      content: JSON.stringify(aiResult),
    });
    sessions.set(sessionId, history);

    if (aiResult.booking?.complete) {
      sendConfirmationMessages(aiResult.booking).catch(console.error);
    }

    return res.json(aiResult);
  } catch (err) {
    console.error("Error in /receptionist:", err);
    return res.status(500).json({ error: "AI receptionist error" });
  }
});

/**
 * -------- Twilio Voice webhook --------
 * Set your Twilio number's "A CALL COMES IN" webhook to:
 *   POST https://YOUR-REPLIT-URL/twilio/voice
 */
app.post("/twilio/voice", async (req, res) => {
  const vr = new VoiceResponse();
  const callSid = req.body.CallSid;
  const speech = req.body.SpeechResult; // Twilio speech-to-text

  // First hit: no speech yet -> greet + gather
  if (!speech) {
    const gather = vr.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
    });

    gather.say(
      "Hi, you’ve reached Sammies Automotive, mobile mechanical services. " +
        "How can we help you today?"
    );

    return res.type("text/xml").send(vr.toString());
  }

  try {
    const history = getCallHistory(callSid);

    const aiResult = await handleReceptionistTurn(history, speech);
    const { next_message_to_customer, booking, escalation } = aiResult;

    history.push({ role: "user", content: speech });
    history.push({
      role: "assistant",
      content: JSON.stringify(aiResult),
    });
    setCallHistory(callSid, history);

    // If escalation requested -> try to transfer to mechanic
    if (escalation?.escalate_to_human && process.env.MECHANIC_MOBILE) {
      vr.say(
        "One moment please, I’ll try to put you through to the mechanic now."
      );

      const dial = vr.dial({
        action: "/twilio/after-transfer",
        method: "POST",
        timeout: 20, // seconds to ring
      });

      dial.number(process.env.MECHANIC_MOBILE);

      return res.type("text/xml").send(vr.toString());
    }

    // If booking is complete -> send SMS and finish nicely
    if (booking?.complete) {
      sendConfirmationMessages(booking).catch(console.error);

      vr.say(
        `Thanks ${booking.name || ""}. I’ve recorded your booking for ${
          booking.job_type || "your vehicle"
        }.`
      );

      vr.say(
        "You’ll receive a confirmation message shortly. The mechanic will be in touch soon. Goodbye."
      );

      return res.type("text/xml").send(vr.toString());
    }

    // Normal conversational turn -> ask the next question
    const gather = vr.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
    });

    gather.say(
      next_message_to_customer ||
        "Sorry, I didn’t catch that. Could you please say that again?"
    );

    return res.type("text/xml").send(vr.toString());
  } catch (err) {
    console.error("Error in /twilio/voice:", err);
    vr.say(
      "Sorry, there was a problem on our end. Please try calling again later."
    );
    return res.type("text/xml").send(vr.toString());
  }
});

/**
 * -------- After transfer attempt --------
 * Twilio posts here after Dial finishes.
 * If mechanic didn't answer, take a message.
 */
app.post("/twilio/after-transfer", (req, res) => {
  const vr = new VoiceResponse();
  const status = req.body.DialCallStatus; // 'completed', 'busy', 'no-answer', etc.

  if (status === "completed") {
    // Mechanic spoke to caller; nothing else to do.
    return res.type("text/xml").send(vr.toString());
  }

  // Busy / no answer / failed -> voicemail message
  const gather = vr.gather({
    input: "speech",
    action: "/twilio/take-message",
    method: "POST",
  });

  gather.say(
    "Sorry, the mechanic is currently busy on another job and couldn’t take your call. " +
      "Please leave your name, best phone number, and a brief description of the issue after the tone, " +
      "and we’ll call you back as soon as we’re available."
  );

  return res.type("text/xml").send(vr.toString());
});

/**
 * -------- Take voicemail / message --------
 */
app.post("/twilio/take-message", async (req, res) => {
  const vr = new VoiceResponse();
  const transcript = req.body.SpeechResult || "";
  const from = req.body.From;

  try {
    if (process.env.OWNER_MOBILE && process.env.TWILIO_SMS_FROM) {
      const body =
        `VOICEMAIL - Sammies Automotive\n` +
        `From: ${from}\n` +
        `Message: ${transcript}`;

      await smsClient.messages.create({
        from: process.env.TWILIO_SMS_FROM,
        to: process.env.OWNER_MOBILE,
        body,
      });
    }
  } catch (err) {
    console.error("Error sending voicemail SMS:", err);
  }

  vr.say(
    "Thanks, we’ve recorded your message. The mechanic will call you back as soon as they’re free. Goodbye."
  );

  return res.type("text/xml").send(vr.toString());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sammies Automotive AI Receptionist running on port ${PORT}`);
});
