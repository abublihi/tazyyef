const Traffic = require("../models/Traffic");
const Integration = require("../models/Integration");

function trafficLogger(req, res, next) {
  const start = Date.now();
  const { path: requestPath, method, query, body = {}, headers } = req;

  const originalJson = res.json.bind(res);

  res.json = function (jsonBody) {
    const responseTime = Date.now() - start;
    const { statusCode } = res;

    if (requestPath.startsWith("/mock")) {
      const parts = requestPath.split("/").filter(Boolean);
      const integrationKey = parts[1] ?? "";

      Integration.getByKey(integrationKey)
        .then((integration) =>
          Traffic.log({
            integrationKey,
            integrationId: integration?.id ?? "",
            method,
            path: requestPath,
            headers,
            query,
            body,
            statusCode,
            responseTime,
            matchedScenarioId: res.locals.matchedScenarioId ?? "",
          })
        )
        .catch((err) => console.error("[Traffic] Failed to log:", err.message));
    }

    return originalJson(jsonBody);
  };

  next();
}

module.exports = trafficLogger;
