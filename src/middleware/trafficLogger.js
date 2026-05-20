const Traffic = require("../models/Traffic");
const Integration = require("../models/Integration");


function trafficLogger(req, res, next) {
  const start = Date.now();
  const requestPath = req.path;

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;

    if (requestPath.startsWith("/mock")) {
      const parts = requestPath.split("/").filter(Boolean);
      const integrationKey = parts[1] || "";

      Integration.getByKey(integrationKey)
        .then((integration) =>
          Traffic.log({
            integrationKey,
            integrationId: integration ? integration.id : "",
            method: req.method,
            path: requestPath,
            headers: req.headers,
            query: req.query,
            body: req.body || {},
            statusCode,
            responseTime,
            matchedScenarioId: body && body._scenarioId ? body._scenarioId : "",
          })
        )
        .catch((err) => console.error("[Traffic] Failed to log:", err.message));
    }

    return originalJson(body);
  };

  next();
}

module.exports = trafficLogger;
