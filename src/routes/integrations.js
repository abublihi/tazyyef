const express = require("express");
const router = express.Router();
const IntegrationController = require("../controllers/integrationController");
const ImportController = require("../controllers/importController");
const requireAuth = require("../middleware/auth");
const {
  validateBody,
  integrationCreateSchema,
  integrationUpdateSchema,
} = require("../middleware/validator");

// All integration routes require admin authentication
router.use(requireAuth);

router.post("/", validateBody(integrationCreateSchema), IntegrationController.create);
router.get("/", IntegrationController.list);
router.get("/:id", IntegrationController.getById);
router.get("/:id/scenarios", IntegrationController.getScenarios);
router.put("/:id", validateBody(integrationUpdateSchema), IntegrationController.update);
router.delete("/:id", IntegrationController.delete);

// Postman import routes
router.post("/:id/import/preview", ImportController.preview);
router.post("/:id/import/confirm", ImportController.confirm);

module.exports = router;
