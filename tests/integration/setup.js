const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create a dedicated client for test setup/teardown so we can flush
// without relying on the app's shared client (which may have retryStrategy
// calling process.exit).
const testClient = new Redis(redisUrl, {
  lazyConnect: true,
});

beforeAll(async () => {
  await testClient.connect();
});

beforeEach(async () => {
  // Flush all Redis data before each test so tests are isolated
  await testClient.flushall();
});

afterAll(async () => {
  await testClient.quit();

  // Close the app's shared Redis client so Jest exits cleanly
  const appRedis = require("../../src/config/redis");
  await appRedis.quit();
});
