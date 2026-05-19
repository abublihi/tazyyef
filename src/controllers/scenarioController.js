const ScenarioService = require("../services/scenarioService");

class ScenarioController {
  // POST /api/admin/integrations/:integrationId/scenarios
  static async create(req, res) {
    try {
      const scenario = await ScenarioService.create(req.params.integrationId, req.body);
      res.status(201).json(scenario);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /api/admin/integrations/:integrationId/scenarios
  static async list(req, res) {
    try {
      const scenarios = await ScenarioService.listByIntegration(req.params.integrationId);
      res.json(scenarios);
    } catch (err) {
      res.status(err.message === "Integration not found" ? 404 : 500).json({ error: err.message });
    }
  }

  // GET /api/admin/scenarios/:id
  static async getById(req, res) {
    try {
      const scenario = await ScenarioService.getById(req.params.id);
      res.json(scenario);
    } catch (err) {
      res.status(err.message === "Scenario not found" ? 404 : 500).json({ error: err.message });
    }
  }

  // PUT /api/admin/scenarios/:id
  static async update(req, res) {
    try {
      const scenario = await ScenarioService.update(req.params.id, req.body);
      res.json(scenario);
    } catch (err) {
      res.status(err.message === "Scenario not found" ? 404 : 400).json({ error: err.message });
    }
  }

  // DELETE /api/admin/scenarios/:id
  static async delete(req, res) {
    try {
      await ScenarioService.delete(req.params.id);
      res.json({ message: "Scenario deleted" });
    } catch (err) {
      res.status(err.message === "Scenario not found" ? 404 : 500).json({ error: err.message });
    }
  }
}

module.exports = ScenarioController;
