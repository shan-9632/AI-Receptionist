// src/receptionistLogic.js

import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Runs one turn of the Sammies Automotive AI receptionist.
 *
 * @param {Array<{role: "user"|"assistant"|"system", content: string}>} history
 *        Prior conversation messages (excluding the new user message)
 * @param {string} latestUserMessage
 *        The latest thing the caller/customer said (text)
 * @returns {Promise<{ next_message_to_customer: string, booking: any, escalation: any }>}
 */
export async function handleReceptionistTurn(history, latestUserMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: latestUserMessage },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content || "";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse AI JSON, raw text was:", raw, err);
    // Safe fallback if the model produced something invalid
    parsed = {
      next_message_to_customer:
        "Sorry, I had trouble understanding that. Could you please say that again?",
      booking: {
        complete: false,
        message_only: false,
        name: null,
        phone: null,
        job_type: null,
        vehicle_make: null,
        vehicle_model: null,
        vehicle_year: null,
        registration: null,
        vin: null,
        odometer_km: null,
        location: null,
        description: null,
        urgency: null,
        preferred_time: null,
      },
      escalation: {
        escalate_to_human: false,
        reason: null,
        priority: "normal",
      },
    };
  }

  // Basic safety: ensure the shape is at least present
  if (!parsed.booking) {
    parsed.booking = {
      complete: false,
      message_only: false,
      name: null,
      phone: null,
      job_type: null,
      vehicle_make: null,
      vehicle_model: null,
      vehicle_year: null,
      registration: null,
      vin: null,
      odometer_km: null,
      location: null,
      description: null,
      urgency: null,
      preferred_time: null,
    };
  }

  if (!parsed.escalation) {
    parsed.escalation = {
      escalate_to_human: false,
      reason: null,
      priority: "normal",
    };
  }

  return parsed;
}
