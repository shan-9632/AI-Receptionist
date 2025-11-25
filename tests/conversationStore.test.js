/**
 * Tests for conversation store service
 */

const conversationStore = require('../src/services/conversationStore');

describe('conversationStore', () => {
  beforeEach(() => {
    conversationStore.clearAllSessions();
  });

  describe('getOrCreateSession', () => {
    it('should create a new session if it does not exist', () => {
      const session = conversationStore.getOrCreateSession('test-session-1');
      
      expect(session).toBeDefined();
      expect(session.messages).toEqual([]);
      expect(session.bookingDetails).toEqual({
        name: null,
        phone: null,
        job: null,
        address: null,
        urgency: null,
        preferredTime: null
      });
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should return existing session if it exists', () => {
      const session1 = conversationStore.getOrCreateSession('test-session-1');
      session1.messages.push({ role: 'user', content: 'test' });
      
      const session2 = conversationStore.getOrCreateSession('test-session-1');
      
      expect(session2.messages).toHaveLength(1);
      expect(session2.messages[0].content).toBe('test');
    });
  });

  describe('addMessage', () => {
    it('should add a message to the session', () => {
      conversationStore.addMessage('test-session', 'user', 'Hello');
      conversationStore.addMessage('test-session', 'assistant', 'Hi there!');
      
      const messages = conversationStore.getMessages('test-session');
      
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('should create session if it does not exist', () => {
      conversationStore.addMessage('new-session', 'user', 'First message');
      
      const session = conversationStore.getSession('new-session');
      
      expect(session).toBeDefined();
      expect(session.messages).toHaveLength(1);
    });
  });

  describe('updateBookingDetails', () => {
    it('should update booking details partially', () => {
      conversationStore.getOrCreateSession('test-session');
      
      conversationStore.updateBookingDetails('test-session', { name: 'John Doe' });
      conversationStore.updateBookingDetails('test-session', { phone: '555-1234' });
      
      const details = conversationStore.getBookingDetails('test-session');
      
      expect(details.name).toBe('John Doe');
      expect(details.phone).toBe('555-1234');
      expect(details.job).toBeNull();
    });

    it('should overwrite existing values', () => {
      conversationStore.getOrCreateSession('test-session');
      conversationStore.updateBookingDetails('test-session', { name: 'John Doe' });
      conversationStore.updateBookingDetails('test-session', { name: 'Jane Smith' });
      
      const details = conversationStore.getBookingDetails('test-session');
      
      expect(details.name).toBe('Jane Smith');
    });
  });

  describe('getBookingDetails', () => {
    it('should return empty details for non-existent session', () => {
      const details = conversationStore.getBookingDetails('non-existent');
      
      expect(details).toEqual({
        name: null,
        phone: null,
        job: null,
        address: null,
        urgency: null,
        preferredTime: null
      });
    });
  });

  describe('clearSession', () => {
    it('should remove a session', () => {
      conversationStore.getOrCreateSession('test-session');
      conversationStore.addMessage('test-session', 'user', 'Hello');
      
      conversationStore.clearSession('test-session');
      
      const session = conversationStore.getSession('test-session');
      expect(session).toBeUndefined();
    });
  });
});
