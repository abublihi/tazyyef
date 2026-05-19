const redis = require("../config/redis");
const { v4: uuidv4 } = require("uuid");

const INTEGRATION_PREFIX = "integration:";
const INTEGRATION_INDEX = "integrations:index";

class Integration {
  // Create a new integration with auto-generated unique key
  static async create({ name, description, key }) {
    const id = uuidv4();
    const integrationKey = (key && key.trim()) ? key.trim() : `mock-${uuidv4().slice(0, 8)}`;
    const integration = {
      id,
      name,
      key: integrationKey,
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const multi = redis.multi();
    multi.hset(`${INTEGRATION_PREFIX}${id}`, integration);
    multi.sadd(INTEGRATION_INDEX, id);
    await multi.exec();

    return integration;
  }

  // Fetch a single integration by ID
  static async getById(id) {
    const data = await redis.hgetall(`${INTEGRATION_PREFIX}${id}`);
    if (!data || !data.id) return null;
    return data;
  }

  // Fetch a single integration by its unique key
  static async getByKey(key) {
    const ids = await redis.smembers(INTEGRATION_INDEX);
    for (const id of ids) {
      const data = await redis.hget(`${INTEGRATION_PREFIX}${id}`, "key");
      if (data === key) {
        return this.getById(id);
      }
    }
    return null;
  }

  // List all integrations with optional search
  static async list(search) {
    const ids = await redis.smembers(INTEGRATION_INDEX);
    const integrations = await Promise.all(
      ids.map((id) => this.getById(id))
    );
    const results = integrations.filter(Boolean);
    if (!search) return results;
    const term = search.toLowerCase();
    return results.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.key.toLowerCase().includes(term) ||
        (i.description && i.description.toLowerCase().includes(term))
    );
  }

  // Update integration fields
  static async update(id, fields) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...fields,
      id,
      updatedAt: new Date().toISOString(),
    };

    await redis.hset(`${INTEGRATION_PREFIX}${id}`, updated);
    return updated;
  }

  // Delete integration and all its scenarios
  static async delete(id) {
    const Scenario = require("./Scenario");
    await Scenario.deleteAllForIntegration(id);

    const multi = redis.multi();
    multi.del(`${INTEGRATION_PREFIX}${id}`);
    multi.srem(INTEGRATION_INDEX, id);
    await multi.exec();
    return true;
  }
}

module.exports = Integration;
