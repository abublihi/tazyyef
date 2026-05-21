const session = require("express-session");

// connect-redis v9 uses node-redis v4 API ({ EX: ttl }) which ioredis doesn't support.
// This thin store speaks ioredis's native API directly.
class IoRedisSessionStore extends session.Store {
  constructor(client, prefix = "sess:") {
    super();
    this.client = client;
    this.prefix = prefix;
  }

  async get(sid, callback) {
    try {
      const data = await this.client.get(this.prefix + sid);
      callback(null, data ? JSON.parse(data) : null);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const ttl = sessionData.cookie?.maxAge
        ? Math.ceil(sessionData.cookie.maxAge / 1000)
        : 86400;
      await this.client.set(this.prefix + sid, JSON.stringify(sessionData), "EX", ttl);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.client.del(this.prefix + sid);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      const ttl = sessionData.cookie?.maxAge
        ? Math.ceil(sessionData.cookie.maxAge / 1000)
        : 86400;
      await this.client.expire(this.prefix + sid, ttl);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = IoRedisSessionStore;
