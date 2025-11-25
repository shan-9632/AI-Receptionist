# AI Receptionist

A Node.js + Express backend that acts as an AI receptionist, powered by OpenAI API. It exposes a POST `/receptionist` endpoint that maintains conversation state and collects booking details from users.

## Features

- **Conversational AI**: Natural language conversation with customers
- **Session Management**: Maintains conversation state across multiple requests
- **Booking Collection**: Automatically extracts and stores booking details:
  - Name
  - Phone number
  - Job/service description
  - Address
  - Urgency level
  - Preferred appointment time
- **JSON API**: Clean JSON responses with conversation and booking data

## Prerequisites

- Node.js 18.x or higher
- npm
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/shan-9632/AI-Receptionist.git
cd AI-Receptionist
```

2. Install dependencies:
```bash
npm install
```

3. Set your OpenAI API key as an environment variable:
```bash
export OPENAI_API_KEY=your-api-key-here
```

## Usage

### Start the server

```bash
npm start
```

The server will start on port 3000 by default (configurable via `PORT` environment variable).

### API Endpoints

#### Health Check
```
GET /health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Receptionist Endpoint
```
POST /receptionist
```
Main conversation endpoint for the AI receptionist.

**Request Body:**
```json
{
  "sessionId": "unique-session-id",
  "userMessage": "Hello, I need to book an appointment"
}
```

**Response:**
```json
{
  "sessionId": "unique-session-id",
  "response": "Hello! I'd be happy to help you book an appointment. May I have your name please?",
  "bookingDetails": {
    "name": null,
    "phone": null,
    "job": null,
    "address": null,
    "urgency": null,
    "preferredTime": null
  }
}
```

### Example Conversation Flow

```bash
# First request - greeting
curl -X POST http://localhost:3000/receptionist \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-123", "userMessage": "Hi, I need a plumber"}'

# Response includes job detected
# {"sessionId":"session-123","response":"...","bookingDetails":{"job":"plumbing",...}}

# Second request - provide name
curl -X POST http://localhost:3000/receptionist \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-123", "userMessage": "My name is John Smith"}'

# Response now includes name
# {"sessionId":"session-123","response":"...","bookingDetails":{"name":"John Smith","job":"plumbing",...}}
```

## Running Tests

```bash
npm test
```

## Project Structure

```
.
├── src/
│   ├── index.js              # Application entry point
│   ├── app.js                # Express app configuration
│   ├── routes/
│   │   └── receptionist.js   # Receptionist endpoint handler
│   └── services/
│       ├── conversationStore.js  # In-memory session storage
│       └── openaiService.js      # OpenAI API integration
├── tests/
│   ├── conversationStore.test.js
│   ├── openaiService.test.js
│   └── receptionist.test.js
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `OPENAI_API_KEY` | OpenAI API key | Required |

## License

ISC