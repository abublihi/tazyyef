const Integration = require("../models/Integration");
const Scenario = require("../models/Scenario");

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

class MockService {
  // Find the best matching scenario for an incoming mock request.
  // A scenario is eligible only if ALL of its match criteria are satisfied.
  // Among eligible scenarios, the one with the most criteria wins (most specific).
  static async matchScenario(integrationKey, endpoint, method, headers, query, body) {
    const integration = await Integration.getByKey(integrationKey);
    if (!integration) return null;

    const reqMethod = method.toUpperCase();
    const scenarios = await Scenario.listByRoute(integration.id, reqMethod, endpoint);
    if (!scenarios.length) return null;

    const eligible = scenarios
      .map((raw) => ({
        ...raw,
        headers: JSON.parse(raw.headers || "{}"),
        queryParams: JSON.parse(raw.queryParams || "{}"),
        bodyParams: JSON.parse(raw.bodyParams || "{}"),
      }))
      .map((scenario) => {
        const criteriaSets = [
          { source: scenario.headers, target: headers, transformKey: (k) => k.toLowerCase() },
          { source: scenario.queryParams, target: query },
          ...(BODY_METHODS.has(reqMethod)
            ? [{ source: scenario.bodyParams, target: body, coerce: true }]
            : []),
        ];

        let matchedCriteria = 0;
        let allMatch = true;

        for (const { source, target, transformKey, coerce } of criteriaSets) {
          for (const [key, expectedValue] of Object.entries(source)) {
            const lookupKey = transformKey ? transformKey(key) : key;
            const actualValue = target[lookupKey];

            const matches = coerce
              ? actualValue !== undefined && String(actualValue) === String(expectedValue)
              : actualValue === expectedValue;

            if (matches) {
              matchedCriteria++;
            } else {
              allMatch = false;
            }
          }
        }

        return { scenario, allMatch, matchedCriteria };
      })
      .filter(({ allMatch }) => allMatch);

    if (!eligible.length) return null;

    const best = eligible.reduce((a, b) =>
      b.matchedCriteria > a.matchedCriteria ? b : a
    );

    return {
      ...best.scenario,
      id: best.scenario.id,
      rateLimit: best.scenario.rateLimit ? parseInt(best.scenario.rateLimit, 10) : null,
      rateWindow: best.scenario.rateWindow ? parseInt(best.scenario.rateWindow, 10) : null,
    };
  }
}

module.exports = MockService;
