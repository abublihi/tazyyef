const redis = require("../config/redis");
const { v4: uuidv4 } = require("uuid");

const SCENARIO_PREFIX = "scenario:";
const GLOBAL_INDEX_KEY = "scenarios:index";

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

const scenarioIndexKey = (integrationId) => `integration:${integrationId}:scenarios:index`;
const routeIndexKey = (integrationId, method, endpoint) =>
  `integration:${integrationId}:scenarios:route:${method.toUpperCase()}:${endpoint}`;

class Scenario {
  static async create(integrationId, data) {
    const id = uuidv4();
    const endpoint = validateEndpoint(data.endpoint);
    const scenario = {
      id,
      integrationId,
      endpoint,
      method: (data.method ?? "GET").toUpperCase(),
      headers: JSON.stringify(data.headers ?? {}),
      queryParams: JSON.stringify(data.queryParams ?? {}),
      bodyParams: JSON.stringify(data.bodyParams ?? {}),
      responseCode: parseInt(data.responseCode, 10) || 200,
      responseBody: data.responseBody ?? "{}",
      rateLimit: parseInt(data.rateLimit, 10) || null,
      rateWindow: parseInt(data.rateWindow, 10) || null,
      source: data.source ?? "manual",
      importMetadata: data.importMetadata ? JSON.stringify(data.importMetadata) : "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const multi = redis.multi();
    multi.hset(`${SCENARIO_PREFIX}${id}`, scenario);
    multi.sadd(scenarioIndexKey(integrationId), id);
    multi.sadd(GLOBAL_INDEX_KEY, id);
    multi.sadd(routeIndexKey(integrationId, scenario.method, scenario.endpoint), id);
    await multi.exec();

    return scenario;
  }

  static async getById(id) {
    const data = await redis.hgetall(`${SCENARIO_PREFIX}${id}`);
    return data?.id ? data : null;
  }

  static async listByIntegration(integrationId) {
    const ids = await redis.smembers(scenarioIndexKey(integrationId));
    const scenarios = await Promise.all(ids.map((id) => this.getById(id)));
    return scenarios.filter(Boolean);
  }

  static async listByRoute(integrationId, method, endpoint) {
    const ids = await redis.smembers(routeIndexKey(integrationId, method, endpoint));
    const scenarios = await Promise.all(ids.map((id) => this.getById(id)));
    return scenarios.filter(Boolean);
  }

  static async update(id, fields) {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (fields.endpoint !== undefined) {
      fields.endpoint = validateEndpoint(fields.endpoint);
    }

    const parsed = {
      ...existing,
      headers: JSON.parse(existing.headers),
      queryParams: JSON.parse(existing.queryParams),
      bodyParams: JSON.parse(existing.bodyParams),
    };

    const merged = { ...parsed };
    for (const key of ["headers", "queryParams", "bodyParams"]) {
      if (fields[key] !== undefined) {
        merged[key] = typeof fields[key] === "string" ? JSON.parse(fields[key]) : fields[key];
      }
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

    const multi = redis.multi();
    multi.hset(`${SCENARIO_PREFIX}${id}`, updated);

    if (updated.method !== existing.method || updated.endpoint !== existing.endpoint) {
      multi.srem(routeIndexKey(existing.integrationId, existing.method, existing.endpoint), id);
      multi.sadd(routeIndexKey(updated.integrationId, updated.method, updated.endpoint), id);
    }

    await multi.exec();
    return updated;
  }

  static async delete(id) {
    const scenario = await this.getById(id);
    if (!scenario) return false;

    const multi = redis.multi();
    multi.del(`${SCENARIO_PREFIX}${id}`);
    multi.srem(scenarioIndexKey(scenario.integrationId), id);
    multi.srem(GLOBAL_INDEX_KEY, id);
    multi.srem(routeIndexKey(scenario.integrationId, scenario.method, scenario.endpoint), id);
    await multi.exec();
    return true;
  }

  static async deleteAllForIntegration(integrationId) {
    const ids = await redis.smembers(scenarioIndexKey(integrationId));
    if (!ids.length) return;

    const scenarios = await Promise.all(ids.map((id) => this.getById(id)));

    const multi = redis.multi();
    for (const id of ids) {
      multi.del(`${SCENARIO_PREFIX}${id}`);
      multi.srem(GLOBAL_INDEX_KEY, id);
    }
    for (const s of scenarios) {
      if (s) {
        multi.del(routeIndexKey(integrationId, s.method, s.endpoint));
      }
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
        method: (data.method ?? "GET").toUpperCase(),
        headers: JSON.stringify(data.headers ?? {}),
        queryParams: JSON.stringify(data.queryParams ?? {}),
        bodyParams: JSON.stringify(data.bodyParams ?? {}),
        responseCode: parseInt(data.responseCode, 10) || 200,
        responseBody: data.responseBody ?? "{}",
        rateLimit: data.rateLimit ? parseInt(data.rateLimit, 10) : null,
        rateWindow: data.rateWindow ? parseInt(data.rateWindow, 10) : null,
        source: data.source ?? "manual",
        importMetadata: data.importMetadata ? JSON.stringify(data.importMetadata) : "{}",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      multi.hset(`${SCENARIO_PREFIX}${id}`, scenario);
      multi.sadd(scenarioIndexKey(integrationId), id);
      multi.sadd(GLOBAL_INDEX_KEY, id);
      multi.sadd(routeIndexKey(integrationId, scenario.method, scenario.endpoint), id);
      created.push(scenario);
    }

    await multi.exec();
    return created;
  }

  static async listAll(search) {
    const ids = await redis.smembers(GLOBAL_INDEX_KEY);
    const scenarios = await Promise.all(ids.map((id) => this.getById(id)));
    const results = scenarios.filter(Boolean);

    if (!search) return results;

    const term = search.toLowerCase();
    return results.filter((s) =>
      s.endpoint.toLowerCase().includes(term) ||
      s.method.toLowerCase().includes(term) ||
      s.responseCode.toString().includes(term) ||
      s.source?.toLowerCase().includes(term)
    );
  }

  static async findConflicts(integrationId, endpoints) {
    const existingScenarios = await this.listByIntegration(integrationId);
    const existingMap = new Map(
      existingScenarios.map((s) => [`${s.method}:${s.endpoint}`, s])
    );

    return endpoints.reduce(
      (acc, ep) => {
        const key = `${ep.method}:${ep.endpoint}`;
        if (existingMap.has(key)) {
          acc.conflicts.push({ ...ep, conflict: existingMap.get(key) });
        } else {
          acc.nonConflicts.push(ep);
        }
        return acc;
      },
      { conflicts: [], nonConflicts: [] }
    );
  }
}

module.exports = Scenario;
