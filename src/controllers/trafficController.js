const TrafficService = require("../services/trafficService");
const asyncHandler = require("../middleware/asyncHandler");

class TrafficController {
  static list = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const integrationId = req.query.integrationId || undefined;

    const [entries, total] = await Promise.all([
      TrafficService.list({ limit, offset, integrationId }),
      TrafficService.count({ integrationId }),
    ]);

    res.json({ entries, total, limit, offset });
  });

  static getById = asyncHandler(async (req, res) => {
    const entry = await TrafficService.getById(req.params.id);
    res.json(entry);
  });

  static delete = asyncHandler(async (req, res) => {
    await TrafficService.delete(req.params.id);
    res.json({ message: "Traffic entry deleted" });
  });

  static clear = asyncHandler(async (req, res) => {
    const integrationId = req.query.integrationId || undefined;
    const count = await TrafficService.clear({ integrationId });
    res.json({ message: `Cleared ${count} traffic entries`, count });
  });
}

module.exports = TrafficController;
