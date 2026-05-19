const IntegrationService = require("../services/integrationService");

class IntegrationController {
  // POST /api/admin/integrations
  static async create(req, res) {
    try {
      const integration = await IntegrationService.create(req.body);
      res.status(201).json(integration);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /api/admin/integrations
  static async list(req, res) {
    try {
      const { search } = req.query;
      const integrations = await IntegrationService.list(search);
      res.json(integrations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/admin/integrations/:id
  static async getById(req, res) {
    try {
      const integration = await IntegrationService.getById(req.params.id);
      res.json(integration);
    } catch (err) {
      res.status(err.message === "Integration not found" ? 404 : 500).json({ error: err.message });
    }
  }

  // PUT /api/admin/integrations/:id
  static async update(req, res) {
    try {
      const integration = await IntegrationService.update(req.params.id, req.body);
      res.json(integration);
    } catch (err) {
      res.status(err.message === "Integration not found" ? 404 : 400).json({ error: err.message });
    }
  }

  // GET /api/admin/integrations/:id/scenarios
  static async getScenarios(req, res) {
    try {
      const scenarios = await IntegrationService.getScenarios(req.params.id);
      res.json(scenarios);
    } catch (err) {
      res.status(err.message === "Integration not found" ? 404 : 500).json({ error: err.message });
    }
  }

  // DELETE /api/admin/integrations/:id
  static async delete(req, res) {
    try {
      await IntegrationService.delete(req.params.id);
      res.json({ message: "Integration deleted" });
    } catch (err) {
      res.status(err.message === "Integration not found" ? 404 : 500).json({ error: err.message });
    }
  }
}

module.exports = IntegrationController;
