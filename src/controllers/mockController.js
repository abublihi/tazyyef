const MockService = require("../services/mockService");
const { mockRateLimiter, createScenarioRateLimiter } = require("../middleware/rateLimiter");

const scenarioLimiterCache = new Map();

class MockController {
  static async handle(req, res) {
    const { integrationKey } = req.params;
    const endpoint = req.path.replace(`/${integrationKey}`, "") || "/";
    const method = req.method;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = value;
    }

    const query = req.query;
    const body = req.body || {};

    const match = await MockService.matchScenario(integrationKey, endpoint, method, headers, query, body);

    if (!match) {
      return res.status(404).json({ error: "No matching scenario found" });
    }

    if (match.id && !scenarioLimiterCache.has(match.id)) {
      scenarioLimiterCache.set(match.id, createScenarioRateLimiter(match));
    }

    const scenarioLimiter = scenarioLimiterCache.get(match.id) || mockRateLimiter;

    return new Promise((resolve) => {
      scenarioLimiter(req, res, () => {
        let responseBody;
        try {
          responseBody = typeof match.responseBody === "string"
            ? JSON.parse(match.responseBody)
            : match.responseBody;
        } catch {
          responseBody = match.responseBody;
        }

        res.locals.matchedScenarioId = match.id;
        res.status(parseInt(match.responseCode, 10)).json(responseBody);
        resolve();
      });
    });
  }
}

module.exports = MockController;
