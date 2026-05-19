const Traffic = require("../models/Traffic");
const Integration = require("../models/Integration");

function trafficLogger(req, res, next) {
  const start = Date.now();

  console.log(`[Traffic] Middleware hit: ${req.method} ${req.path}`);

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;

    console.log(
      `[Traffic] Response: ${req.method} ${req.path} -> ${statusCode}`,
    );

    if (req.path.startsWith("/mock")) {
      const parts = req.path.split("/").filter(Boolean);
      const integrationKey = parts[0] || "";

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
            path: req.path,
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
