const Redis = require("ioredis");
const env = require("./env");

// Single Redis client instance reused across the app
const redis = new Redis(env.redisUrl, {
  retryStrategy(times) {
    if (times > 10) {
      console.error("[Redis] Max retries reached. Exiting...");
      process.exit(1);
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => console.log("[Redis] Connected"));
redis.on("error", (err) => console.error("[Redis] Error:", err.message));

module.exports = redis;
