const Integration = require("../models/Integration");
const Scenario = require("../models/Scenario");

class MockService {
  // Find the best matching scenario for an incoming mock request.
  // A scenario is eligible only if ALL of its match criteria are satisfied.
  // Among eligible scenarios, the one with the most criteria wins (most specific).
  static async matchScenario(
    integrationKey,
    endpoint,
    method,
    headers,
    query,
    body,
  ) {
    const integration = await Integration.getByKey(integrationKey);
    if (!integration) return null;

    const scenarios = await Scenario.listByIntegration(integration.id);
    if (!scenarios.length) return null;

    const reqMethod = method.toUpperCase();

    let bestMatch = null;
    let bestScore = -1;

    for (const raw of scenarios) {
      const scenario = {
        ...raw,
        headers: JSON.parse(raw.headers || "{}"),
        queryParams: JSON.parse(raw.queryParams || "{}"),
        bodyParams: JSON.parse(raw.bodyParams || "{}"),
      };

      // Method and endpoint must match exactly
      if (scenario.method !== reqMethod) continue;
      if (scenario.endpoint !== endpoint) continue;

      // Count total criteria and matched criteria
      let totalCriteria = 0;
      let matchedCriteria = 0;
      let allMatch = true;

      // Check headers
      for (const [key, value] of Object.entries(scenario.headers)) {
        totalCriteria += 1;
        if (headers[key.toLowerCase()] === value) {
          matchedCriteria += 1;
        } else {
          allMatch = false;
        }
      }

      // Check query params
      for (const [key, value] of Object.entries(scenario.queryParams)) {
        totalCriteria += 1;
        if (query[key] === value) {
          matchedCriteria += 1;
        } else {
          allMatch = false;
        }
      }

      // Check body params (only for methods that typically have a body)
      if (["POST", "PUT", "PATCH"].includes(reqMethod)) {
        for (const [key, value] of Object.entries(scenario.bodyParams)) {
          totalCriteria += 1;
          if (
            body &&
            body[key] !== undefined &&
            String(body[key]) === String(value)
          ) {
            matchedCriteria += 1;
          } else {
            allMatch = false;
          }
        }
      }

      // Scenario is only eligible if ALL its criteria are satisfied
      if (!allMatch) continue;

      // Among eligible scenarios, prefer the one with the most criteria
      if (matchedCriteria > bestScore) {
        bestScore = matchedCriteria;
        bestMatch = {
          ...scenario,
          id: raw.id,
          rateLimit: raw.rateLimit ? parseInt(raw.rateLimit, 10) : null,
          rateWindow: raw.rateWindow ? parseInt(raw.rateWindow, 10) : null,
        };
      }
    }

    return bestMatch;
  }
}

module.exports = MockService;
