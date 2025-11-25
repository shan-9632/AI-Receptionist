/**
 * Receptionist Route Handler
 * POST /receptionist endpoint for AI receptionist conversations
 */

const express = require('express');
const router = express.Router();
const conversationStore = require('../services/conversationStore');
const openaiService = require('../services/openaiService');

/**
 * POST /receptionist
 * Handles conversation with the AI receptionist
 * 
 * Request body:
 * - sessionId: string (required) - Unique identifier for the conversation session
 * - userMessage: string (required) - The user's message
 * 
 * Response:
 * - sessionId: string - The session identifier
 * - response: string - The AI receptionist's response
 * - bookingDetails: object - Current booking details collected so far
 */
router.post('/', async (req, res) => {
  try {
    const { sessionId, userMessage } = req.body;

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing required field: sessionId'
      });
    }

    if (!userMessage) {
      return res.status(400).json({
        error: 'Missing required field: userMessage'
      });
    }

    if (typeof sessionId !== 'string') {
      return res.status(400).json({
        error: 'sessionId must be a string'
      });
    }

    if (typeof userMessage !== 'string') {
      return res.status(400).json({
        error: 'userMessage must be a string'
      });
    }

    // Ensure the session exists
    conversationStore.getOrCreateSession(sessionId);

    // Add the user's message to the conversation history
    conversationStore.addMessage(sessionId, 'user', userMessage);

    // Get the current conversation history
    const messages = conversationStore.getMessages(sessionId);

    // Send to OpenAI and get response
    const { response, bookingDetails: extractedDetails } = await openaiService.chat(messages);

    // Add the assistant's response to the conversation history
    conversationStore.addMessage(sessionId, 'assistant', response);

    // Update booking details with any new information (filter out null values)
    const updatedDetails = Object.fromEntries(
      Object.entries(extractedDetails).filter(([, value]) => value !== null)
    );
    
    if (Object.keys(updatedDetails).length > 0) {
      conversationStore.updateBookingDetails(sessionId, updatedDetails);
    }

    // Get the final booking details
    const bookingDetails = conversationStore.getBookingDetails(sessionId);

    res.json({
      sessionId,
      response,
      bookingDetails
    });
  } catch (error) {
    console.error('Error in receptionist endpoint:', error);
    
    // Handle OpenAI API errors
    if (error.status === 401) {
      return res.status(500).json({
        error: 'OpenAI API authentication failed. Please check your API key.'
      });
    }
    
    if (error.status === 429) {
      return res.status(503).json({
        error: 'OpenAI API rate limit exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'An error occurred while processing your request.'
    });
  }
});

module.exports = router;
