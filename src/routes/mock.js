const express = require("express");
const router = express.Router();
const MockController = require("../controllers/mockController");

// Catch-all: /mock/:integrationKey/* — matches any path under the integration key
router.all("/:integrationKey/*", MockController.handle);

// Also handle the root of the integration key (e.g., /mock/abc123)
router.all("/:integrationKey", MockController.handle);

module.exports = router;
