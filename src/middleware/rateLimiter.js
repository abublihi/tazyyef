const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redis = require("../config/redis");
const env = require("../config/env");

const mockRateLimiter = rateLimit({
  windowMs: env.mockRateWindow,
  max: env.mockRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const createScenarioRateLimiter = (scenario) => {
  const max = scenario.rateLimit || env.defaultScenarioRateLimit;
  const windowMs = scenario.rateWindow || env.defaultScenarioRateWindow;

  return rateLimit({
    windowMs,
    max,
    store: new RedisStore({
      prefix: `ratelimit:scenario:${scenario.id}:`,
      sendCommand: (...args) => redis.call(...args),
    }),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    message: { error: "Scenario rate limit exceeded, please try again later" },
  });
};

module.exports = { mockRateLimiter, createScenarioRateLimiter };
