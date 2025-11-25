/**
 * In-memory conversation state store
 * Stores conversation history and booking details for each session
 */

// Map to store conversation state by sessionId
const sessions = new Map();

/**
 * Booking details structure
 * @typedef {Object} BookingDetails
 * @property {string|null} name - Customer's name
 * @property {string|null} phone - Customer's phone number
 * @property {string|null} job - Job/service description
 * @property {string|null} address - Customer's address
 * @property {string|null} urgency - Urgency level of the request
 * @property {string|null} preferredTime - Customer's preferred time for the appointment
 */

/**
 * Session data structure
 * @typedef {Object} SessionData
 * @property {Array<{role: string, content: string}>} messages - Conversation history
 * @property {BookingDetails} bookingDetails - Collected booking details
 * @property {Date} createdAt - Session creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Creates a new empty booking details object
 * @returns {BookingDetails}
 */
function createEmptyBookingDetails() {
  return {
    name: null,
    phone: null,
    job: null,
    address: null,
    urgency: null,
    preferredTime: null
  };
}

/**
 * Gets or creates a session for the given sessionId
 * @param {string} sessionId - The session identifier
 * @returns {SessionData}
 */
function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    const now = new Date();
    sessions.set(sessionId, {
      messages: [],
      bookingDetails: createEmptyBookingDetails(),
      createdAt: now,
      updatedAt: now
    });
  }
  return sessions.get(sessionId);
}

/**
 * Gets a session by sessionId
 * @param {string} sessionId - The session identifier
 * @returns {SessionData|undefined}
 */
function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Adds a message to the session's conversation history
 * @param {string} sessionId - The session identifier
 * @param {string} role - The role (user, assistant, system)
 * @param {string} content - The message content
 */
function addMessage(sessionId, role, content) {
  const session = getOrCreateSession(sessionId);
  session.messages.push({ role, content });
  session.updatedAt = new Date();
}

/**
 * Updates booking details for a session
 * @param {string} sessionId - The session identifier
 * @param {Partial<BookingDetails>} details - The booking details to update
 */
function updateBookingDetails(sessionId, details) {
  const session = getOrCreateSession(sessionId);
  Object.assign(session.bookingDetails, details);
  session.updatedAt = new Date();
}

/**
 * Gets the conversation messages for a session
 * @param {string} sessionId - The session identifier
 * @returns {Array<{role: string, content: string}>}
 */
function getMessages(sessionId) {
  const session = getSession(sessionId);
  return session ? session.messages : [];
}

/**
 * Gets the booking details for a session
 * @param {string} sessionId - The session identifier
 * @returns {BookingDetails}
 */
function getBookingDetails(sessionId) {
  const session = getSession(sessionId);
  return session ? session.bookingDetails : createEmptyBookingDetails();
}

/**
 * Clears a session
 * @param {string} sessionId - The session identifier
 */
function clearSession(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Clears all sessions (useful for testing)
 */
function clearAllSessions() {
  sessions.clear();
}

module.exports = {
  getOrCreateSession,
  getSession,
  addMessage,
  updateBookingDetails,
  getMessages,
  getBookingDetails,
  clearSession,
  clearAllSessions
};
