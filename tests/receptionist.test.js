/**
 * Tests for receptionist API endpoint
 */

const request = require('supertest');
const app = require('../src/app');
const conversationStore = require('../src/services/conversationStore');
const openaiService = require('../src/services/openaiService');

// Mock the OpenAI service
jest.mock('../src/services/openaiService');

describe('POST /receptionist', () => {
  beforeEach(() => {
    conversationStore.clearAllSessions();
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('should return 400 when sessionId is missing', async () => {
      const response = await request(app)
        .post('/receptionist')
        .send({ userMessage: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required field: sessionId');
    });

    it('should return 400 when userMessage is missing', async () => {
      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required field: userMessage');
    });

    it('should return 400 when sessionId is not a string', async () => {
      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 123, userMessage: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('sessionId must be a string');
    });

    it('should return 400 when userMessage is not a string', async () => {
      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: { text: 'Hello' } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userMessage must be a string');
    });
  });

  describe('successful requests', () => {
    it('should return response with sessionId, response, and bookingDetails', async () => {
      openaiService.chat.mockResolvedValue({
        response: 'Hello! How can I help you today?',
        bookingDetails: {
          name: null,
          phone: null,
          job: null,
          address: null,
          urgency: null,
          preferredTime: null
        }
      });

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'Hi' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('test-session');
      expect(response.body.response).toBe('Hello! How can I help you today?');
      expect(response.body.bookingDetails).toEqual({
        name: null,
        phone: null,
        job: null,
        address: null,
        urgency: null,
        preferredTime: null
      });
    });

    it('should update booking details when provided', async () => {
      openaiService.chat.mockResolvedValue({
        response: 'Nice to meet you, John! What phone number can we reach you at?',
        bookingDetails: {
          name: 'John Doe',
          phone: null,
          job: null,
          address: null,
          urgency: null,
          preferredTime: null
        }
      });

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'My name is John Doe' });

      expect(response.status).toBe(200);
      expect(response.body.bookingDetails.name).toBe('John Doe');
    });

    it('should maintain conversation state across multiple requests', async () => {
      // First message
      openaiService.chat.mockResolvedValueOnce({
        response: 'Nice to meet you, John!',
        bookingDetails: { name: 'John Doe', phone: null, job: null, address: null, urgency: null, preferredTime: null }
      });

      await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'My name is John Doe' });

      // Second message
      openaiService.chat.mockResolvedValueOnce({
        response: 'Got it! Your phone is 555-1234.',
        bookingDetails: { name: null, phone: '555-1234', job: null, address: null, urgency: null, preferredTime: null }
      });

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'My phone is 555-1234' });

      // Should have both name and phone from accumulated details
      expect(response.body.bookingDetails.name).toBe('John Doe');
      expect(response.body.bookingDetails.phone).toBe('555-1234');

      // Verify the OpenAI service was called twice
      expect(openaiService.chat).toHaveBeenCalledTimes(2);
      
      // Verify the second call included the previous user message
      const secondCallMessages = openaiService.chat.mock.calls[1][0];
      expect(secondCallMessages.some(m => m.content === 'My name is John Doe')).toBe(true);
      expect(secondCallMessages.some(m => m.content === 'My phone is 555-1234')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return 500 on OpenAI API error', async () => {
      openaiService.chat.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'Hello' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An error occurred while processing your request.');
    });

    it('should return 500 with auth message on 401 error', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      openaiService.chat.mockRejectedValue(error);

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'Hello' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('authentication failed');
    });

    it('should return 503 on rate limit error', async () => {
      const error = new Error('Rate limited');
      error.status = 429;
      openaiService.chat.mockRejectedValue(error);

      const response = await request(app)
        .post('/receptionist')
        .send({ sessionId: 'test-session', userMessage: 'Hello' });

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('rate limit');
    });
  });
});

describe('GET /health', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });
});
