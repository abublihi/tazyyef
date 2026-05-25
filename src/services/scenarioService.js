const Scenario = require("../models/Scenario");
const Integration = require("../models/Integration");

const VALID_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]);

class ScenarioService {
  static async create(integrationId, data) {
    const integration = await Integration.getById(integrationId);
    if (!integration) throw new Error("Integration not found");

    if (!data.method) throw new Error("HTTP method is required");
    const method = data.method.toUpperCase();
    if (!VALID_METHODS.has(method)) {
      throw new Error(`Invalid HTTP method. Must be one of: ${[...VALID_METHODS].join(", ")}`);
    }

    return Scenario.create(integrationId, {
      endpoint: data.endpoint,
      method,
      headers: data.headers ?? {},
      queryParams: data.queryParams ?? {},
      bodyParams: data.bodyParams ?? {},
      responseCode: data.responseCode ?? 200,
      responseBody: data.responseBody ?? "{}",
      rateLimit: data.rateLimit ?? null,
      rateWindow: data.rateWindow ?? null,
    });
  }

  static async listByIntegration(integrationId) {
    const integration = await Integration.getById(integrationId);
    if (!integration) throw new Error("Integration not found");
    return Scenario.listByIntegration(integrationId);
  }

  static async listAll(search) {
    return Scenario.listAll(search);
  }

  static async getById(id) {
    const scenario = await Scenario.getById(id);
    if (!scenario) throw new Error("Scenario not found");
    return scenario;
  }

  static async update(id, data) {
    await this.getById(id);

    const method = data.method?.toUpperCase();
    if (method && !VALID_METHODS.has(method)) {
      throw new Error(`Invalid HTTP method. Must be one of: ${[...VALID_METHODS].join(", ")}`);
    }

    const pickDefined = (obj, keys) =>
      Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

    const updates = pickDefined(data, [
      "endpoint",
      "method",
      "headers",
      "queryParams",
      "bodyParams",
      "responseCode",
      "responseBody",
      "rateLimit",
      "rateWindow",
    ]);

    if (updates.method) updates.method = updates.method.toUpperCase();

    return Scenario.update(id, updates);
  }

  static async delete(id) {
    await this.getById(id);
    return Scenario.delete(id);
  }
}

module.exports = ScenarioService;
