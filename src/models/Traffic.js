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
      matchedScenarioId: matchedScenarioId ?? "",
      timestamp,
    };

    const multi = redis.multi();
    multi.hset(`${TRAFFIC_PREFIX}${id}`, entry);
    multi.expire(`${TRAFFIC_PREFIX}${id}`, TRAFFIC_TTL_SECONDS);
    multi.zadd(TRAFFIC_INDEX, Date.now(), id);
    if (integrationId) {
      const key = `${TRAFFIC_BY_INTEGRATION}${integrationId}`;
      multi.zadd(key, Date.now(), id);
    }
    await multi.exec();

    return entry;
  }

  static async getById(id) {
    const data = await redis.hgetall(`${TRAFFIC_PREFIX}${id}`);
    if (!data?.id) return null;

    const entry = {
      ...data,
      headers: JSON.parse(data.headers ?? "{}"),
      query: JSON.parse(data.query ?? "{}"),
      body: JSON.parse(data.body ?? "{}"),
    };

    if (entry.matchedScenarioId) {
      const Scenario = require("./Scenario");
      const scenario = await Scenario.getById(entry.matchedScenarioId);
      if (scenario) {
        entry.scenarioMethod = scenario.method;
        entry.scenarioEndpoint = scenario.endpoint;
      }
    }

    return entry;
  }

  static async list({ limit = 50, offset = 0, integrationId } = {}) {
    const key = integrationId ? `${TRAFFIC_BY_INTEGRATION}${integrationId}` : TRAFFIC_INDEX;
    const ids = await redis.zrange(key, "-inf", "+inf", "BYSCORE");
    const page = ids.reverse().slice(offset, offset + limit);
    const entries = await Promise.all(page.map((id) => this.getById(id)));
    return entries.filter(Boolean);
  }

  static async count({ integrationId } = {}) {
    return redis.zcard(integrationId ? `${TRAFFIC_BY_INTEGRATION}${integrationId}` : TRAFFIC_INDEX);
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

  static async listByScenario(scenarioId, { limit = 100, offset = 0 } = {}) {
    const ids = await redis.zrange(TRAFFIC_INDEX, "-inf", "+inf", "BYSCORE");
    const reversed = ids.reverse();

    const entries = [];
    let matched = 0;

    for (const id of reversed) {
      const entry = await this.getById(id);
      if (!entry) continue;
      if (entry.matchedScenarioId === scenarioId) {
        if (matched >= offset && entries.length < limit) {
          entries.push(entry);
        }
        matched++;
      }
    }

    return { entries, total: matched };
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
