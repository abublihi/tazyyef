# API Mock

A full-stack API mocking application with a web-based admin panel, Redis-backed storage, and intelligent scenario matching.

## Features

- **Integrations Management** — CRUD operations for mock API integrations with auto-generated unique keys
- **Scenario Management** — Define mock responses per endpoint, method, headers, query params, and body params
- **Dynamic Response Matching** — Requests are matched to the most specific scenario based on parameter overlap
- **Admin Panel** — Web UI for managing integrations and scenarios, with built-in scenario testing
- **Session-based Auth** — Admin login with bcrypt-hashed password and persistent sessions via Redis
- **Rate Limiting** — Configurable rate limiting on the mock API to prevent abuse
- **Request Logging** — HTTP request/response logging via Morgan

## Project Structure

```
api-mock/
├── src/
│   ├── config/
│   │   ├── env.js          # Environment variable loader
│   │   └── redis.js        # Redis client setup
│   ├── models/
│   │   ├── Integration.js  # Integration data model (Redis-backed)
│   │   └── Scenario.js     # Scenario data model (Redis-backed)
│   ├── services/
│   │   ├── integrationService.js
│   │   ├── scenarioService.js
│   │   ├── authService.js
│   │   └── mockService.js  # Scenario matching logic
│   ├── controllers/
│   │   ├── integrationController.js
│   │   ├── scenarioController.js
│   │   ├── authController.js
│   │   └── mockController.js
│   ├── routes/
│   │   ├── integrations.js
│   │   ├── scenarios.js
│   │   ├── auth.js
│   │   └── mock.js
│   ├── middleware/
│   │   ├── auth.js         # Session authentication guard
│   │   ├── rateLimiter.js  # Rate limiting for mock API
│   │   ├── logger.js       # HTTP request logging
│   │   └── validator.js    # JSON field validation
│   └── app.js              # Express app entry point
├── public/
│   ├── index.html          # Admin panel HTML
│   ├── css/style.css       # Admin panel styles
│   └── js/admin.js         # Admin panel JavaScript
├── .env.example
├── package.json
└── README.md
```

## Prerequisites

- **Node.js** >= 18
- **Redis** server running locally or accessible via URL

## Setup

1. **Clone and install dependencies:**

```bash
cd api-mock
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
ADMIN_USER=admin
ADMIN_PASS=admin
SESSION_SECRET=change-this-to-a-random-string
MOCK_RATE_LIMIT=100
MOCK_RATE_WINDOW_MS=60000
```

3. **Start Redis** (if not already running):

```bash
redis-server
```

4. **Run the application:**

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server starts at `http://localhost:3000`.

## Usage

### Admin Panel

Navigate to `http://localhost:3000` and log in with the credentials from your `.env` file.

1. **Create an Integration** — Give it a name; a unique key is auto-generated (e.g., `mock-a1b2c3d4`)
2. **Add Scenarios** — Define endpoint, method, matching conditions, and the mock response
3. **Test Scenarios** — Use the built-in test panel to send requests and verify responses

### Mock API

External clients call the mock API using the integration key:

```
http://localhost:3000/mock/{integration_key}/path/to/endpoint
```

**Example:**

```bash
# Assuming integration key is "mock-a1b2c3d4" and a scenario exists for GET /users
curl http://localhost:3000/mock/mock-a1b2c3d4/users
```

### Scenario Matching Logic

When a request arrives, the system:

1. Finds the integration by its key
2. Filters scenarios by matching **method** and **endpoint** exactly
3. Scores each candidate scenario by counting matching headers, query params, and body params
4. Returns the response from the scenario with the **highest score** (most specific match)
5. Returns `404` if no scenario matches

### Admin API Endpoints

All admin endpoints require authentication (session cookie).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auth/login` | Login with `{ username, password }` |
| POST | `/api/admin/auth/logout` | Logout |
| GET | `/api/admin/auth/me` | Check auth status |
| POST | `/api/admin/integrations` | Create integration `{ name, description }` |
| GET | `/api/admin/integrations` | List all integrations |
| GET | `/api/admin/integrations/:id` | Get integration by ID |
| PUT | `/api/admin/integrations/:id` | Update integration |
| DELETE | `/api/admin/integrations/:id` | Delete integration (and its scenarios) |
| POST | `/api/admin/integrations/:id/scenarios` | Create scenario |
| GET | `/api/admin/integrations/:id/scenarios` | List scenarios for integration |
| GET | `/api/admin/scenarios/:id` | Get scenario by ID |
| PUT | `/api/admin/scenarios/:id` | Update scenario |
| DELETE | `/api/admin/scenarios/:id` | Delete scenario |

## Redis Persistence

Data is stored in Redis and persists across app restarts as long as Redis itself persists. Configure Redis persistence (RDB snapshots or AOF) in your `redis.conf` for durability.

## License

MIT
