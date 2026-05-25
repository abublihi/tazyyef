require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

const parseIntOr = (val, fallback) => {
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

function requireEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    if (isProd) throw new Error(`[Config] ${name} must be set in production`);
    return fallback;
  }
  return value;
}

module.exports = {
  port: parseIntOr(process.env.PORT, 3000),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  adminUser: requireEnv("ADMIN_USER", "admin"),
  adminPass: requireEnv("ADMIN_PASS", "admin"),
  sessionSecret: requireEnv("SESSION_SECRET", "change-this-to-a-random-string"),
  mockRateLimit: parseIntOr(process.env.MOCK_RATE_LIMIT, 100),
  mockRateWindow: parseIntOr(process.env.MOCK_RATE_WINDOW_MS, 60000),
  defaultScenarioRateLimit: parseIntOr(process.env.DEFAULT_SCENARIO_RATE_LIMIT, 50),
  defaultScenarioRateWindow: parseIntOr(process.env.DEFAULT_SCENARIO_RATE_WINDOW_MS, 60000),
  trafficLogTtlDays: parseIntOr(process.env.TRAFFIC_LOG_TTL_DAYS, 7),
};
