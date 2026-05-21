const express = require("express");
const session = require("express-session");
const IoRedisSessionStore = require("./config/sessionStore");
const path = require("path");
const fs = require("fs");
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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(logger);
app.use(trafficLogger);

app.use(
  session({
    store: new IoRedisSessionStore(redis),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/admin/auth", authRoutes);
app.use("/api/admin/integrations", integrationRoutes);
app.use("/api/admin", scenarioRoutes);
app.use("/api/admin/traffic", trafficRoutes);
app.use("/mock", mockRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", message: "Redis unavailable" });
  }
});

// ─── Frontend (Vite in dev, static in prod) ───────────────────────────────────

const adminDist = path.join(__dirname, "..", "admin", "dist");
const isDev = process.env.NODE_ENV !== "production";
const useAdminBuild = fs.existsSync(path.join(adminDist, "index.html"));

async function setupFrontend() {
  if (isDev) {
    // In development: attach Vite middleware for HMR and fresh module resolution
    const { createServer } = require("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve static build
    app.use(express.static(adminDist));

    // SPA fallback for React Router
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api") && !req.path.startsWith("/mock")) {
        res.sendFile(path.join(adminDist, "index.html"));
      }
    });
  }

  // ─── Error Handling ───────────────────────────────────────────────────────────

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err, req, res, _next) => {
    console.error("[Error]", err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  // ─── Start Server ─────────────────────────────────────────────────────────────

  app.listen(env.port, () => {
    console.log(`[Server] Listening on http://localhost:${env.port}`);
    console.log(`[Server] Admin panel: http://localhost:${env.port}`);
    console.log(
      `[Server] Mock API base: http://localhost:${env.port}/mock/:integrationKey`,
    );
  });
}

setupFrontend().catch((err) => {
  console.error("[Error] Failed to setup frontend:", err);
  process.exit(1);
});

module.exports = app;
