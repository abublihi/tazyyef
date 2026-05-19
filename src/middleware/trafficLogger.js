const Traffic = require("../models/Traffic");
const Integration = require("../models/Integration");

function trafficLogger(req, res, next) {
  const start = Date.now();
  const requestPath = req.path;

  console.log(`[Traffic] Middleware hit: ${req.method} ${requestPath}`);

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;

    console.log(
      `[Traffic] Response: ${req.method} ${requestPath} -> ${statusCode}`,
    );

    if (requestPath.startsWith("/mock")) {
      const parts = requestPath.split("/").filter(Boolean);
      const integrationKey = parts[1] || "";

      console.log(`[Traffic] Logging mock request: key=${integrationKey}`);

      (async () => {
        try {
          const integration = await Integration.getByKey(integrationKey);
          console.log(
            `[Traffic] Integration found: ${integration ? integration.id : "none"}`,
          );

          const headers = {};
          for (const [key, value] of Object.entries(req.headers)) {
            headers[key.toLowerCase()] = value;
          }

          const logged = await Traffic.log({
            integrationKey,
            integrationId: integration ? integration.id : "",
            method: req.method,
            path: requestPath,
            headers,
            query: req.query,
            body: req.body || {},
            statusCode,
            responseTime,
            matchedScenarioId: body && body._scenarioId ? body._scenarioId : "",
          });
          console.log(`[Traffic] Logged entry: ${logged.id}`);
        } catch (err) {
          console.error("[Traffic] Failed to log:", err.message);
          console.error(err.stack);
        }
      })();
    }

    return originalJson(body);
  };

  next();
}

module.exports = trafficLogger;
