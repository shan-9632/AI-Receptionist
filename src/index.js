/**
 * AI Receptionist Backend - Main Entry Point
 * 
 * This server exposes a POST /receptionist endpoint that:
 * - Takes a sessionId and userMessage
 * - Maintains conversation state per session
 * - Collects booking details (name, phone, job, address, urgency, preferred time)
 * - Returns responses in JSON format
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Receptionist server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Receptionist endpoint: POST http://localhost:${PORT}/receptionist`);
});
