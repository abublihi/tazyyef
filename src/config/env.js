require("dotenv").config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  adminUser: process.env.ADMIN_USER || "admin",
  adminPass: process.env.ADMIN_PASS || "admin",
  sessionSecret: process.env.SESSION_SECRET || "change-this-to-a-random-string",
  mockRateLimit: parseInt(process.env.MOCK_RATE_LIMIT, 10) || 100,
  mockRateWindow: parseInt(process.env.MOCK_RATE_WINDOW_MS, 10) || 60000,
  defaultScenarioRateLimit: parseInt(process.env.DEFAULT_SCENARIO_RATE_LIMIT, 10) || 50,
  defaultScenarioRateWindow: parseInt(process.env.DEFAULT_SCENARIO_RATE_WINDOW_MS, 10) || 60000,
};
