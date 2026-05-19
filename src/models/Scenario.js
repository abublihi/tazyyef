const redis = require("../config/redis");
const { v4: uuidv4 } = require("uuid");

const SCENARIO_PREFIX = "scenario:";

const validateEndpoint = (endpoint) => {
  if (!endpoint) return "/";
  if (/^https?:\/\//i.test(endpoint)) {
    throw new Error("Endpoint must be a path starting with /. Full URLs are not allowed.");
  }
  if (!endpoint.startsWith("/")) {
    throw new Error("Endpoint must start with /");
  }
  return endpoint;
};

function scenarioIndexKey(integrationId) {
  return `integration:${integrationId}:scenarios:index`;
}

class Scenario {
  // Create a new scenario for an integration
  static async create(integrationId, data) {
    const id = uuidv4();
    const endpoint = validateEndpoint(data.endpoint);
    const scenario = {
      id,
      integrationId,
      endpoint,
      method: (data.method || "GET").toUpperCase(),
      headers: JSON.stringify(data.headers || {}),
      queryParams: JSON.stringify(data.queryParams || {}),
      bodyParams: JSON.stringify(data.bodyParams || {}),
      responseCode: parseInt(data.responseCode, 10) || 200,
      responseBody: data.responseBody || "{}",
      rateLimit: parseInt(data.rateLimit, 10) || null,
      rateWindow: parseInt(data.rateWindow, 10) || null,
      source: data.source || "manual",
      importMetadata: data.importMetadata ? JSON.stringify(data.importMetadata) : "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const multi = redis.multi();
    multi.hset(`${SCENARIO_PREFIX}${id}`, scenario);
    multi.sadd(scenarioIndexKey(integrationId), id);
    await multi.exec();

    return scenario;
  }

  // Fetch a single scenario by ID
  static async getById(id) {
    const data = await redis.hgetall(`${SCENARIO_PREFIX}${id}`);
    if (!data || !data.id) return null;
    return data;
  }

  // List all scenarios for a given integration
  static async listByIntegration(integrationId) {
    const ids = await redis.smembers(scenarioIndexKey(integrationId));
    const scenarios = await Promise.all(
      ids.map((id) => this.getById(id))
    );
    return scenarios.filter(Boolean);
  }

  // Update scenario fields
  static async update(id, fields) {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (fields.endpoint !== undefined) {
      fields.endpoint = validateEndpoint(fields.endpoint);
    }

    // Parse JSON fields for merging, then re-stringify
    const parsed = {
      ...existing,
      headers: JSON.parse(existing.headers),
      queryParams: JSON.parse(existing.queryParams),
      bodyParams: JSON.parse(existing.bodyParams),
    };

    // Merge incoming fields — JSON fields come as strings from the API
    const merged = { ...parsed };
    if (fields.headers !== undefined) {
      merged.headers = typeof fields.headers === "string"
        ? JSON.parse(fields.headers)
        : fields.headers;
    }
    if (fields.queryParams !== undefined) {
      merged.queryParams = typeof fields.queryParams === "string"
        ? JSON.parse(fields.queryParams)
        : fields.queryParams;
    }
    if (fields.bodyParams !== undefined) {
      merged.bodyParams = typeof fields.bodyParams === "string"
        ? JSON.parse(fields.bodyParams)
        : fields.bodyParams;
    }

    const updated = {
      ...merged,
      ...fields,
      id,
      integrationId: existing.integrationId,
      headers: JSON.stringify(merged.headers),
      queryParams: JSON.stringify(merged.queryParams),
      bodyParams: JSON.stringify(merged.bodyParams),
      responseBody: fields.responseBody ?? existing.responseBody,
      rateLimit: fields.rateLimit !== undefined ? parseInt(fields.rateLimit, 10) : existing.rateLimit,
      rateWindow: fields.rateWindow !== undefined ? parseInt(fields.rateWindow, 10) : existing.rateWindow,
      updatedAt: new Date().toISOString(),
    };

    await redis.hset(`${SCENARIO_PREFIX}${id}`, updated);
    return updated;
  }

  // Delete a single scenario
  static async delete(id) {
    const scenario = await this.getById(id);
    if (!scenario) return false;

    const multi = redis.multi();
    multi.del(`${SCENARIO_PREFIX}${id}`);
    multi.srem(scenarioIndexKey(scenario.integrationId), id);
    await multi.exec();
    return true;
  }

  // Delete all scenarios for an integration (used when deleting the integration)
  static async deleteAllForIntegration(integrationId) {
    const ids = await redis.smembers(scenarioIndexKey(integrationId));
    if (ids.length === 0) return;

    const multi = redis.multi();
    for (const id of ids) {
      multi.del(`${SCENARIO_PREFIX}${id}`);
    }
    multi.del(scenarioIndexKey(integrationId));
    await multi.exec();
  }

  static async batchCreate(integrationId, scenariosData) {
    if (!scenariosData.length) return [];

    const multi = redis.multi();
    const created = [];

    for (const data of scenariosData) {
      const id = uuidv4();
      const endpoint = validateEndpoint(data.endpoint);
      const scenario = {
        id,
        integrationId,
        endpoint,
        method: (data.method || "GET").toUpperCase(),
        headers: JSON.stringify(data.headers || {}),
        queryParams: JSON.stringify(data.queryParams || {}),
        bodyParams: JSON.stringify(data.bodyParams || {}),
        responseCode: parseInt(data.responseCode, 10) || 200,
        responseBody: data.responseBody || "{}",
        rateLimit: data.rateLimit ? parseInt(data.rateLimit, 10) : null,
        rateWindow: data.rateWindow ? parseInt(data.rateWindow, 10) : null,
        source: data.source || "manual",
        importMetadata: data.importMetadata ? JSON.stringify(data.importMetadata) : "{}",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      multi.hset(`${SCENARIO_PREFIX}${id}`, scenario);
      multi.sadd(scenarioIndexKey(integrationId), id);
      created.push(scenario);
    }

    await multi.exec();
    return created;
  }

  static async listAll(search) {
    const keys = await redis.keys(`${SCENARIO_PREFIX}*`);
    const scenarios = await Promise.all(
      keys.map((key) => redis.hgetall(key))
    );
    const results = scenarios.filter(Boolean);
    if (!search) return results;
    const term = search.toLowerCase();
    return results.filter((s) =>
      s.endpoint.toLowerCase().includes(term) ||
      s.method.toLowerCase().includes(term) ||
      s.responseCode.toString().includes(term) ||
      (s.source && s.source.toLowerCase().includes(term))
    );
  }

  static async findConflicts(integrationId, endpoints) {
    const existingScenarios = await this.listByIntegration(integrationId);
    const existingMap = new Map();

    existingScenarios.forEach((s) => {
      const key = `${s.method}:${s.endpoint}`;
      existingMap.set(key, s);
    });

    const conflicts = [];
    const nonConflicts = [];

    endpoints.forEach((ep) => {
      const key = `${ep.method}:${ep.endpoint}`;
      if (existingMap.has(key)) {
        conflicts.push({
          ...ep,
          conflict: existingMap.get(key),
        });
      } else {
        nonConflicts.push(ep);
      }
    });

    return { conflicts, nonConflicts };
  }
}

module.exports = Scenario;
