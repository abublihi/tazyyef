const redis = require("../config/redis");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");

const TRAFFIC_PREFIX = "traffic:";
const TRAFFIC_INDEX = "traffic:index";
const TRAFFIC_BY_INTEGRATION = "traffic:integration:";
const TRAFFIC_TTL_SECONDS = env.trafficLogTtlDays * 24 * 60 * 60;

class Traffic {
  static async log({ integrationKey, integrationId, method, path, headers, query, body, statusCode, responseTime, matchedScenarioId }) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const entry = {
      id,
      integrationKey,
      integrationId,
      method,
      path,
      headers: JSON.stringify(headers),
      query: JSON.stringify(query),
      body: JSON.stringify(body),
      statusCode,
      responseTime,
      matchedScenarioId: matchedScenarioId || "",
      timestamp,
    };

    const multi = redis.multi();
    multi.hset(`${TRAFFIC_PREFIX}${id}`, entry);
    multi.expire(`${TRAFFIC_PREFIX}${id}`, TRAFFIC_TTL_SECONDS);
    multi.zadd(TRAFFIC_INDEX, Date.now(), id);
    if (integrationId) {
      const key = `${TRAFFIC_BY_INTEGRATION}${integrationId}`;
      console.log(`[Traffic] Adding to integration set: ${key}`);
      multi.zadd(key, Date.now(), id);
    }
    await multi.exec();

    return entry;
  }

  static async getById(id) {
    const data = await redis.hgetall(`${TRAFFIC_PREFIX}${id}`);
    if (!data || !data.id) return null;

    return {
      ...data,
      headers: JSON.parse(data.headers || "{}"),
      query: JSON.parse(data.query || "{}"),
      body: JSON.parse(data.body || "{}"),
    };
  }

  static async list({ limit = 50, offset = 0, integrationId } = {}) {
    let ids;
    if (integrationId) {
      const key = `${TRAFFIC_BY_INTEGRATION}${integrationId}`;
      console.log(`[Traffic] Listing from integration set: ${key}`);
      ids = await redis.zrange(key, "-inf", "+inf", "BYSCORE");
      console.log(`[Traffic] Found ${ids.length} entries`);
    } else {
      ids = await redis.zrange(TRAFFIC_INDEX, "-inf", "+inf", "BYSCORE");
    }

    const reversed = ids.reverse();
    const page = reversed.slice(offset, offset + limit);

    const entries = await Promise.all(
      page.map(async (id) => {
        const data = await redis.hgetall(`${TRAFFIC_PREFIX}${id}`);
        if (!data || !data.id) return null;
        return {
          ...data,
          headers: JSON.parse(data.headers || "{}"),
          query: JSON.parse(data.query || "{}"),
          body: JSON.parse(data.body || "{}"),
        };
      })
    );

    return entries.filter(Boolean);
  }

  static async count({ integrationId } = {}) {
    if (integrationId) {
      return redis.zcard(`${TRAFFIC_BY_INTEGRATION}${integrationId}`);
    }
    return redis.zcard(TRAFFIC_INDEX);
  }

  static async delete(id) {
    const entry = await this.getById(id);
    if (!entry) return false;

    const multi = redis.multi();
    multi.del(`${TRAFFIC_PREFIX}${id}`);
    multi.zrem(TRAFFIC_INDEX, id);
    if (entry.integrationId) {
      multi.zrem(`${TRAFFIC_BY_INTEGRATION}${entry.integrationId}`, id);
    }
    await multi.exec();
    return true;
  }

  static async clear({ integrationId } = {}) {
    if (integrationId) {
      const ids = await redis.zrange(`${TRAFFIC_BY_INTEGRATION}${integrationId}`, "-inf", "+inf", "BYSCORE");
      if (!ids.length) return 0;

      const multi = redis.multi();
      for (const id of ids) {
        multi.del(`${TRAFFIC_PREFIX}${id}`);
        multi.zrem(TRAFFIC_INDEX, id);
      }
      multi.del(`${TRAFFIC_BY_INTEGRATION}${integrationId}`);
      await multi.exec();
      return ids.length;
    }

    const ids = await redis.zrange(TRAFFIC_INDEX, "-inf", "+inf", "BYSCORE");
    if (!ids.length) return 0;

    const multi = redis.multi();
    for (const id of ids) {
      multi.del(`${TRAFFIC_PREFIX}${id}`);
    }
    multi.del(TRAFFIC_INDEX);
    await multi.exec();
    return ids.length;
  }
}

module.exports = Traffic;
