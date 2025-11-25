import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompts.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleReceptionistTurn(conversationHistory, latestUserMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: latestUserMessage }
  ];

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: messages,
  });

  const text = response.output[0].content[0].text;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    parsed = {
      next_message_to_customer: "Sorry, can you repeat that?",
      booking: {
        complete: false,
        name: null, phone: null, job_type: null,
        description: null, location: null,
        urgency: null, preferred_time: null
      }
    };
  }

  return parsed;
}
