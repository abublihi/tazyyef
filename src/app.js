const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const env = require("./config/env");
const logger = require("./middleware/logger");
const trafficLogger = require("./middleware/trafficLogger");
const redis = require("./config/redis");

// Import route modules
const authRoutes = require("./routes/auth");
const integrationRoutes = require("./routes/integrations");
const scenarioRoutes = require("./routes/scenarios");
const mockRoutes = require("./routes/mock");
const trafficRoutes = require("./routes/traffic");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS for admin panel (frontend may be served from a different origin)
app.use(cors({ origin: true, credentials: true }));

// HTTP request logging
app.use(logger);

// Traffic logging for mock API
app.use(trafficLogger);

// Session management backed by Redis for persistence across restarts
const RedisStore = require("express-session").Store;

// Simple in-memory store fallback; Redis store would need connect-redis package
// For production, install connect-redis and use: new RedisStore({ client: redis })
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve static admin panel files
app.use(express.static(path.join(__dirname, "..", "public")));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Admin authentication
app.use("/api/admin/auth", authRoutes);

// Admin API — integrations, scenarios, and traffic (protected by auth middleware)
app.use("/api/admin/integrations", integrationRoutes);
app.use("/api/admin", scenarioRoutes);
app.use("/api/admin/traffic", trafficRoutes);

// Public mock API — no authentication required
app.use("/mock", mockRoutes);

// Serve admin panel for any non-API route
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/mock")) {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error("[Error]", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(env.port, () => {
  console.log(`[Server] Listening on http://localhost:${env.port}`);
  console.log(`[Server] Admin panel: http://localhost:${env.port}`);
  console.log(`[Server] Mock API base: http://localhost:${env.port}/mock/:integrationKey`);
});

module.exports = app;
