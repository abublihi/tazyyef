const MockService = require("../services/mockService");
const { mockRateLimiter, createScenarioRateLimiter } = require("../middleware/rateLimiter");

// WeakMap avoids memory leaks: entries are garbage-collected when scenario objects are no longer referenced
const scenarioLimiterCache = new WeakMap();

class MockController {
  static async handle(req, res, next) {
    const { integrationKey } = req.params;
    const endpoint = req.path.replace(`/${integrationKey}`, "") || "/";
    const { method } = req;

    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    const { query, body = {} } = req;

    const match = await MockService.matchScenario(integrationKey, endpoint, method, headers, query, body);

    if (!match) {
      return res.status(404).json({ error: "No matching scenario found" });
    }

    // Lazy-create and cache rate limiter per scenario object
    let scenarioLimiter = scenarioLimiterCache.get(match);
    if (!scenarioLimiter) {
      scenarioLimiter = createScenarioRateLimiter(match);
      scenarioLimiterCache.set(match, scenarioLimiter);
    }

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
    });
  }
}

module.exports = MockController;
