const express = require("express");
const router = express.Router();
const TrafficController = require("../controllers/trafficController");
const requireAuth = require("../middleware/auth");

router.use(requireAuth);

router.get("/", TrafficController.list);
router.get("/:id", TrafficController.getById);
router.delete("/:id", TrafficController.delete);
router.delete("/", TrafficController.clear);

module.exports = router;
