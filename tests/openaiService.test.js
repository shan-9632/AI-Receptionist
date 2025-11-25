/**
 * Tests for OpenAI service utilities
 */

const { extractBookingDetails, cleanResponse } = require('../src/services/openaiService');

describe('openaiService', () => {
  describe('extractBookingDetails', () => {
    it('should extract booking details from markdown JSON block', () => {
      const response = `Hello! I'd be happy to help you book an appointment.

\`\`\`json
{
  "name": "John Doe",
  "phone": "555-1234",
  "job": null,
  "address": null,
  "urgency": null,
  "preferredTime": null
}
\`\`\``;

      const details = extractBookingDetails(response);
      
      expect(details.name).toBe('John Doe');
      expect(details.phone).toBe('555-1234');
      expect(details.job).toBeNull();
    });

    it('should handle response with all booking details', () => {
      const response = `Great, I have all your information!

\`\`\`json
{
  "name": "Jane Smith",
  "phone": "555-9876",
  "job": "Plumbing repair",
  "address": "123 Main St",
  "urgency": "ASAP",
  "preferredTime": "Tomorrow morning"
}
\`\`\``;

      const details = extractBookingDetails(response);
      
      expect(details.name).toBe('Jane Smith');
      expect(details.phone).toBe('555-9876');
      expect(details.job).toBe('Plumbing repair');
      expect(details.address).toBe('123 Main St');
      expect(details.urgency).toBe('ASAP');
      expect(details.preferredTime).toBe('Tomorrow morning');
    });

    it('should return null values when no JSON block is present', () => {
      const response = 'Hello! How can I help you today?';
      
      const details = extractBookingDetails(response);
      
      expect(details.name).toBeNull();
      expect(details.phone).toBeNull();
      expect(details.job).toBeNull();
      expect(details.address).toBeNull();
      expect(details.urgency).toBeNull();
      expect(details.preferredTime).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      const response = `Here's the info:

\`\`\`json
{ invalid json }
\`\`\``;

      const details = extractBookingDetails(response);
      
      expect(details.name).toBeNull();
      expect(details.phone).toBeNull();
    });
  });

  describe('cleanResponse', () => {
    it('should remove markdown JSON block from response', () => {
      const response = `Hello! I'd be happy to help.

\`\`\`json
{
  "name": "John Doe",
  "phone": null,
  "job": null,
  "address": null,
  "urgency": null,
  "preferredTime": null
}
\`\`\``;

      const cleaned = cleanResponse(response);
      
      expect(cleaned).toBe("Hello! I'd be happy to help.");
      expect(cleaned).not.toContain('```');
      expect(cleaned).not.toContain('json');
    });

    it('should handle response without JSON block', () => {
      const response = 'Hello! How can I help you today?';
      
      const cleaned = cleanResponse(response);
      
      expect(cleaned).toBe('Hello! How can I help you today?');
    });

    it('should trim whitespace', () => {
      const response = `   Hello!   

\`\`\`json
{"name": null}
\`\`\`  `;

      const cleaned = cleanResponse(response);
      
      expect(cleaned).toBe('Hello!');
    });
  });
});
