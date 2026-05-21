const Traffic = require("../models/Traffic");

class TrafficService {
  static async list({ limit = 50, offset = 0, integrationId } = {}) {
    return Traffic.list({ limit, offset, integrationId });
  }

  static async count({ integrationId } = {}) {
    return Traffic.count({ integrationId });
  }

  static async getById(id) {
    const entry = await Traffic.getById(id);
    if (!entry) throw new Error("Traffic entry not found");
    return entry;
  }

  static async delete(id) {
    const deleted = await Traffic.delete(id);
    if (!deleted) throw new Error("Traffic entry not found");
    return true;
  }

  static async listByScenario(scenarioId, { limit = 100, offset = 0 } = {}) {
    return Traffic.listByScenario(scenarioId, { limit, offset });
  }

  static async clear({ integrationId } = {}) {
    return Traffic.clear({ integrationId });
  }
}

module.exports = TrafficService;
