/**
 * OpenAI Service for AI Receptionist
 * Handles communication with OpenAI API and extraction of booking details
 */

const OpenAI = require('openai');

// Lazy-initialized OpenAI client
let openai = null;

/**
 * Gets the OpenAI client instance (lazy initialization)
 * @returns {OpenAI}
 */
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// System prompt for the AI receptionist
const SYSTEM_PROMPT = `You are a friendly and professional AI receptionist for a service booking system. Your job is to have a natural conversation with customers and collect the following booking details:

1. **Name**: The customer's full name
2. **Phone**: The customer's phone number
3. **Job**: What service or job they need (e.g., plumbing repair, electrical work, etc.)
4. **Address**: The service location address
5. **Urgency**: How urgent is the request (e.g., emergency, as soon as possible, within a week, flexible)
6. **Preferred Time**: When they would prefer the appointment

Guidelines:
- Be conversational and polite
- Ask for one piece of information at a time when possible
- Confirm information when provided
- If the customer provides multiple pieces of information at once, acknowledge all of them
- Once you have all the details, summarize the booking and confirm with the customer
- If asked about pricing or availability, explain that a team member will follow up with specific details

After each response, you MUST output a JSON block with the extracted booking details in the following format:
\`\`\`json
{
  "name": "extracted name or null",
  "phone": "extracted phone or null",
  "job": "extracted job description or null",
  "address": "extracted address or null",
  "urgency": "extracted urgency or null",
  "preferredTime": "extracted preferred time or null"
}
\`\`\`

Only include fields that have been explicitly mentioned by the customer. Use null for fields not yet provided.`;

/**
 * Sends a message to OpenAI and gets a response
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @returns {Promise<{response: string, bookingDetails: Object}>}
 */
async function chat(messages) {
  const messagesWithSystem = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model,
    messages: messagesWithSystem,
    temperature: 0.7,
    max_tokens: 500
  });

  const responseContent = completion.choices[0].message.content;
  
  // Extract booking details from the response
  const bookingDetails = extractBookingDetails(responseContent);
  
  // Clean the response (remove the JSON block from what we show to the user)
  const cleanedResponse = cleanResponse(responseContent);

  return {
    response: cleanedResponse,
    bookingDetails
  };
}

/**
 * Extracts booking details JSON from the AI response
 * @param {string} response - The AI response containing JSON block
 * @returns {Object} - Extracted booking details
 */
function extractBookingDetails(response) {
  const defaultDetails = {
    name: null,
    phone: null,
    job: null,
    address: null,
    urgency: null,
    preferredTime: null
  };

  try {
    // Look for JSON block in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        name: parsed.name || null,
        phone: parsed.phone || null,
        job: parsed.job || null,
        address: parsed.address || null,
        urgency: parsed.urgency || null,
        preferredTime: parsed.preferredTime || null
      };
    }
    
    // Try to find inline JSON object
    const inlineJsonMatch = response.match(/\{[\s\S]*"name"[\s\S]*\}/);
    if (inlineJsonMatch) {
      const parsed = JSON.parse(inlineJsonMatch[0]);
      return {
        name: parsed.name || null,
        phone: parsed.phone || null,
        job: parsed.job || null,
        address: parsed.address || null,
        urgency: parsed.urgency || null,
        preferredTime: parsed.preferredTime || null
      };
    }
  } catch {
    // If parsing fails, return default details
  }

  return defaultDetails;
}

/**
 * Removes the JSON block from the response for clean display
 * @param {string} response - The AI response
 * @returns {string} - Cleaned response
 */
function cleanResponse(response) {
  // Remove markdown JSON block
  let cleaned = response.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
  
  // Remove any standalone JSON objects that look like booking details
  cleaned = cleaned.replace(/\{[\s\S]*?"name"[\s\S]*?"preferredTime"[\s\S]*?\}/g, '').trim();
  
  return cleaned;
}

module.exports = {
  chat,
  extractBookingDetails,
  cleanResponse,
  SYSTEM_PROMPT
};
