const EventEmitter = require("events");

class MockRedis extends EventEmitter {
  constructor() {
    super();
    // Do not emit connect to avoid async logging after tests complete
  }

  // Common Redis commands - no-op or return defaults
  async get() { return null; }
  async set() { return "OK"; }
  async del() { return 1; }
  async hgetall() { return {}; }
  async hget() { return null; }
  async hset() { return 1; }
  async hdel() { return 1; }
  async sadd() { return 1; }
  async srem() { return 1; }
  async smembers() { return []; }
  async multi() {
    return {
      hset: () => {},
      sadd: () => {},
      srem: () => {},
      hdel: () => {},
      del: () => {},
      exec: async () => [],
    };
  }
  async expire() { return 1; }
  async zadd() { return 1; }
  async zrange() { return []; }
  async zremrangebyscore() { return 0; }
  async quit() { return "OK"; }
  async disconnect() { return "OK"; }
  async ping() { return "PONG"; }
}

module.exports = MockRedis;
