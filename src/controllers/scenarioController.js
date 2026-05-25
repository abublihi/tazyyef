const ScenarioService = require("../services/scenarioService");
const asyncHandler = require("../middleware/asyncHandler");

class ScenarioController {
  // POST /api/admin/integrations/:integrationId/scenarios
  static create = asyncHandler(async (req, res) => {
    const scenario = await ScenarioService.create(req.params.integrationId, req.body);
    res.status(201).json(scenario);
  });

  // GET /api/admin/integrations/:integrationId/scenarios
  static list = asyncHandler(async (req, res) => {
    const scenarios = await ScenarioService.listByIntegration(req.params.integrationId);
    res.json(scenarios);
  });

  // GET /api/admin/scenarios
  static listAll = asyncHandler(async (req, res) => {
    const [scenarios, integrations] = await Promise.all([
      ScenarioService.listAll(req.query.search),
      require("../models/Integration").list(),
    ]);

    const integrationMap = new Map(integrations.map((i) => [i.id, i]));

    const enriched = scenarios.map((s) => {
      const integration = integrationMap.get(s.integrationId);
      return {
        ...s,
        integrationName: integration?.name ?? "Unknown",
        integrationKey: integration?.key ?? "",
      };
    });

    res.json(enriched);
  });

  // GET /api/admin/scenarios/:id
  static getById = asyncHandler(async (req, res) => {
    const scenario = await ScenarioService.getById(req.params.id);
    res.json(scenario);
  });

  // PUT /api/admin/scenarios/:id
  static update = asyncHandler(async (req, res) => {
    const scenario = await ScenarioService.update(req.params.id, req.body);
    res.json(scenario);
  });

  // DELETE /api/admin/scenarios/:id
  static delete = asyncHandler(async (req, res) => {
    await ScenarioService.delete(req.params.id);
    res.json({ message: "Scenario deleted" });
  });

  // GET /api/admin/scenarios/:id/traffic
  static getTraffic = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;
    await ScenarioService.getById(req.params.id); // ensure exists
    const TrafficService = require("../services/trafficService");
    const result = await TrafficService.listByScenario(req.params.id, { limit, offset });
    res.json(result);
  });
}

module.exports = ScenarioController;
