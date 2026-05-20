const express = require("express");
const router = express.Router();
const ScenarioController = require("../controllers/scenarioController");
const requireAuth = require("../middleware/auth");
const {
  validateBody,
  scenarioCreateSchema,
  scenarioUpdateSchema,
} = require("../middleware/validator");

// All scenario routes require admin authentication
router.use(requireAuth);

// Scenarios scoped under an integration
router.post(
  "/integrations/:integrationId/scenarios",
  validateBody(scenarioCreateSchema),
  ScenarioController.create
);
router.get("/integrations/:integrationId/scenarios", ScenarioController.list);

// Individual scenario operations
router.get("/scenarios", ScenarioController.listAll);
router.get("/scenarios/:id", ScenarioController.getById);
router.put(
  "/scenarios/:id",
  validateBody(scenarioUpdateSchema),
  ScenarioController.update
);
router.delete("/scenarios/:id", ScenarioController.delete);

module.exports = router;
