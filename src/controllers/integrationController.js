const IntegrationService = require("../services/integrationService");
const asyncHandler = require("../middleware/asyncHandler");

class IntegrationController {
  // POST /api/admin/integrations
  static create = asyncHandler(async (req, res) => {
    const integration = await IntegrationService.create(req.body);
    res.status(201).json(integration);
  });

  // GET /api/admin/integrations
  static list = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const integrations = await IntegrationService.list(search);
    res.json(integrations);
  });

  // GET /api/admin/integrations/:id
  static getById = asyncHandler(async (req, res) => {
    const integration = await IntegrationService.getById(req.params.id);
    res.json(integration);
  });

  // PUT /api/admin/integrations/:id
  static update = asyncHandler(async (req, res) => {
    const integration = await IntegrationService.update(req.params.id, req.body);
    res.json(integration);
  });

  // GET /api/admin/integrations/:id/scenarios
  static getScenarios = asyncHandler(async (req, res) => {
    const scenarios = await IntegrationService.getScenarios(req.params.id);
    res.json(scenarios);
  });

  // DELETE /api/admin/integrations/:id
  static delete = asyncHandler(async (req, res) => {
    await IntegrationService.delete(req.params.id);
    res.json({ message: "Integration deleted" });
  });
}

module.exports = IntegrationController;
