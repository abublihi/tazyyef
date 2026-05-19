const Scenario = require("../models/Scenario");
const Integration = require("../models/Integration");

const VALID_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

const validateEndpoint = (endpoint) => {
  if (!endpoint) throw new Error("Endpoint is required");
  if (/^https?:\/\//i.test(endpoint)) {
    throw new Error("Endpoint must be a path starting with /. Full URLs are not allowed.");
  }
  if (!endpoint.startsWith("/")) {
    throw new Error("Endpoint must start with /");
  }
};

class ScenarioService {
  static async create(integrationId, data) {
    const integration = await Integration.getById(integrationId);
    if (!integration) throw new Error("Integration not found");

    validateEndpoint(data.endpoint);
    if (!data.method) throw new Error("HTTP method is required");
    if (!VALID_METHODS.includes(data.method.toUpperCase())) {
      throw new Error(`Invalid HTTP method. Must be one of: ${VALID_METHODS.join(", ")}`);
    }

    return Scenario.create(integrationId, {
      endpoint: data.endpoint,
      method: data.method.toUpperCase(),
      headers: data.headers || {},
      queryParams: data.queryParams || {},
      bodyParams: data.bodyParams || {},
      responseCode: data.responseCode || 200,
      responseBody: data.responseBody || "{}",
      rateLimit: data.rateLimit || null,
      rateWindow: data.rateWindow || null,
    });
  }

  static async listByIntegration(integrationId) {
    const integration = await Integration.getById(integrationId);
    if (!integration) throw new Error("Integration not found");
    return Scenario.listByIntegration(integrationId);
  }

  static async getById(id) {
    const scenario = await Scenario.getById(id);
    if (!scenario) throw new Error("Scenario not found");
    return scenario;
  }

  static async update(id, data) {
    const existing = await this.getById(id);

    if (data.endpoint !== undefined) {
      validateEndpoint(data.endpoint);
    }

    if (data.method && !VALID_METHODS.includes(data.method.toUpperCase())) {
      throw new Error(`Invalid HTTP method. Must be one of: ${VALID_METHODS.join(", ")}`);
    }

    const updates = {};
    if (data.endpoint !== undefined) updates.endpoint = data.endpoint;
    if (data.method !== undefined) updates.method = data.method.toUpperCase();
    if (data.headers !== undefined) updates.headers = data.headers;
    if (data.queryParams !== undefined) updates.queryParams = data.queryParams;
    if (data.bodyParams !== undefined) updates.bodyParams = data.bodyParams;
    if (data.responseCode !== undefined) updates.responseCode = data.responseCode;
    if (data.responseBody !== undefined) updates.responseBody = data.responseBody;
    if (data.rateLimit !== undefined) updates.rateLimit = data.rateLimit;
    if (data.rateWindow !== undefined) updates.rateWindow = data.rateWindow;

    return Scenario.update(id, updates);
  }

  static async delete(id) {
    await this.getById(id); // throws if not found
    return Scenario.delete(id);
  }
}

module.exports = ScenarioService;
