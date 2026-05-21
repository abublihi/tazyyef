require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

function require_env(name, fallback) {
  const value = process.env[name];
  if (!value) {
    if (isProd) throw new Error(`[Config] ${name} must be set in production`);
    return fallback;
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  adminUser: require_env("ADMIN_USER", "admin"),
  adminPass: require_env("ADMIN_PASS", "admin"),
  sessionSecret: require_env("SESSION_SECRET", "change-this-to-a-random-string"),
  mockRateLimit: parseInt(process.env.MOCK_RATE_LIMIT, 10) || 100,
  mockRateWindow: parseInt(process.env.MOCK_RATE_WINDOW_MS, 10) || 60000,
  defaultScenarioRateLimit: parseInt(process.env.DEFAULT_SCENARIO_RATE_LIMIT, 10) || 50,
  defaultScenarioRateWindow: parseInt(process.env.DEFAULT_SCENARIO_RATE_WINDOW_MS, 10) || 60000,
  trafficLogTtlDays: parseInt(process.env.TRAFFIC_LOG_TTL_DAYS, 10) || 7,
};
