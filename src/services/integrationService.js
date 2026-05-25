const Integration = require("../models/Integration");

class IntegrationService {
  static async create(data) {
    const name = data.name?.trim();
    if (!name) throw new Error("Integration name is required");

    if (data.key?.trim()) {
      const existing = await Integration.getByKey(data.key.trim());
      if (existing) throw new Error("Integration key already exists");
    }

    return Integration.create({
      name,
      description: data.description?.trim() ?? "",
      key: data.key,
    });
  }

  static async list(search) {
    return Integration.list(search);
  }

  static async getById(id) {
    const integration = await Integration.getById(id);
    if (!integration) throw new Error("Integration not found");
    return integration;
  }

  static async update(id, data) {
    const existing = await this.getById(id);

    const updates = Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
    );

    if (updates.key !== undefined) {
      const trimmedKey = updates.key;
      if (!trimmedKey) throw new Error("Integration key cannot be empty");
      if (trimmedKey !== existing.key) {
        const conflict = await Integration.getByKey(trimmedKey);
        if (conflict && conflict.id !== id) {
          throw new Error("Integration key already exists");
        }
      }
    }

    return Integration.update(id, updates);
  }

  static async getScenarios(id) {
    await this.getById(id);
    const Scenario = require("../models/Scenario");
    return Scenario.listByIntegration(id);
  }

  static async delete(id) {
    await this.getById(id);
    return Integration.delete(id);
  }
}

module.exports = IntegrationService;
