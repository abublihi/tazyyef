const Integration = require("../models/Integration");

class IntegrationService {
  static async create(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Integration name is required");
    }
    if (data.key && data.key.trim()) {
      const existing = await Integration.getByKey(data.key.trim());
      if (existing) throw new Error("Integration key already exists");
    }
    return Integration.create({
      name: data.name.trim(),
      description: data.description?.trim() || "",
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
    const updates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.key !== undefined) {
      const trimmedKey = data.key.trim();
      if (!trimmedKey) throw new Error("Integration key cannot be empty");
      if (trimmedKey !== existing.key) {
        const conflict = await Integration.getByKey(trimmedKey);
        if (conflict && conflict.id !== id) {
          throw new Error("Integration key already exists");
        }
      }
      updates.key = trimmedKey;
    }
    return Integration.update(id, updates);
  }

  static async getScenarios(id) {
    await this.getById(id); // throws if not found
    const Scenario = require("../models/Scenario");
    return Scenario.listByIntegration(id);
  }

  static async delete(id) {
    await this.getById(id); // throws if not found
    return Integration.delete(id);
  }
}

module.exports = IntegrationService;
