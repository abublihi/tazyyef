const TrafficService = require("../services/trafficService");

class TrafficController {
  static async list(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const integrationId = req.query.integrationId || undefined;

      const [entries, total] = await Promise.all([
        TrafficService.list({ limit, offset, integrationId }),
        TrafficService.count({ integrationId }),
      ]);

      res.json({ entries, total, limit, offset });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const entry = await TrafficService.getById(req.params.id);
      res.json(entry);
    } catch (err) {
      res
        .status(err.message === "Traffic entry not found" ? 404 : 500)
        .json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      await TrafficService.delete(req.params.id);
      res.json({ message: "Traffic entry deleted" });
    } catch (err) {
      res
        .status(err.message === "Traffic entry not found" ? 404 : 500)
        .json({ error: err.message });
    }
  }

  static async clear(req, res) {
    try {
      const integrationId = req.query.integrationId || undefined;
      const count = await TrafficService.clear({ integrationId });
      res.json({ message: `Cleared ${count} traffic entries`, count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = TrafficController;
