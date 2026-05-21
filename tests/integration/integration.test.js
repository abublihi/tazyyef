const Integration = require("../../src/models/Integration");
const Scenario = require("../../src/models/Scenario");
const Traffic = require("../../src/models/Traffic");

describe("Integration Model (Redis)", () => {
  describe("create", () => {
    it("creates an integration with a generated key", async () => {
      const integration = await Integration.create({
        name: "Test API",
        description: "A test integration",
      });

      expect(integration.id).toBeDefined();
      expect(integration.name).toBe("Test API");
      expect(integration.key).toMatch(/^mock-/);
      expect(integration.createdAt).toBeDefined();
    });

    it("creates an integration with a custom key", async () => {
      const integration = await Integration.create({
        name: "Custom Key API",
        key: "my-custom-key",
      });

      expect(integration.key).toBe("my-custom-key");
    });

    it("trims whitespace from custom key", async () => {
      const integration = await Integration.create({
        name: "Trimmed Key API",
        key: "  spaced-key  ",
      });

      expect(integration.key).toBe("spaced-key");
    });
  });

  describe("getById", () => {
    it("returns the integration by ID", async () => {
      const created = await Integration.create({ name: "Find Me" });
      const found = await Integration.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe("Find Me");
    });

    it("returns null for non-existent ID", async () => {
      const found = await Integration.getById("does-not-exist");
      expect(found).toBeNull();
    });
  });

  describe("getByKey", () => {
    it("returns the integration by key", async () => {
      const created = await Integration.create({
        name: "By Key",
        key: "lookup-key",
      });
      const found = await Integration.getByKey("lookup-key");

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
    });

    it("returns null for non-existent key", async () => {
      const found = await Integration.getByKey("no-such-key");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("lists all integrations", async () => {
      await Integration.create({ name: "Alpha" });
      await Integration.create({ name: "Beta" });

      const list = await Integration.list();
      expect(list.length).toBe(2);
    });

    it("filters integrations by search term", async () => {
      await Integration.create({ name: "Shopping API", key: "shop" });
      await Integration.create({ name: "Payment API", key: "pay" });

      const results = await Integration.list("shop");
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Shopping API");
    });

    it("returns empty array when nothing exists", async () => {
      const list = await Integration.list();
      expect(list).toEqual([]);
    });
  });

  describe("update", () => {
    it("updates integration fields", async () => {
      const created = await Integration.create({ name: "Old Name" });
      const updated = await Integration.update(created.id, {
        name: "New Name",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.id).toBe(created.id);
    });

    it("updates the key index when key changes", async () => {
      const created = await Integration.create({
        name: "Key Update",
        key: "old-key",
      });

      await Integration.update(created.id, { key: "new-key" });

      const byOld = await Integration.getByKey("old-key");
      expect(byOld).toBeNull();

      const byNew = await Integration.getByKey("new-key");
      expect(byNew).not.toBeNull();
      expect(byNew.id).toBe(created.id);
    });

    it("returns null for non-existent ID", async () => {
      const result = await Integration.update("no-id", { name: "X" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes an integration and its key index", async () => {
      const created = await Integration.create({
        name: "To Delete",
        key: "delete-me",
      });

      await Integration.delete(created.id);

      expect(await Integration.getById(created.id)).toBeNull();
      expect(await Integration.getByKey("delete-me")).toBeNull();
    });

    it("deletes scenarios belonging to the integration", async () => {
      const integration = await Integration.create({ name: "Parent" });
      const scenario = await Scenario.create(integration.id, {
        endpoint: "/api/test",
        method: "GET",
      });

      await Integration.delete(integration.id);

      expect(await Scenario.getById(scenario.id)).toBeNull();
    });
  });
});

describe("Scenario Model (Redis)", () => {
  let integration;

  beforeEach(async () => {
    integration = await Integration.create({ name: "Test Integration" });
  });

  describe("create", () => {
    it("creates a scenario with defaults", async () => {
      const scenario = await Scenario.create(integration.id, {
        endpoint: "/api/users",
      });

      expect(scenario.id).toBeDefined();
      expect(scenario.integrationId).toBe(integration.id);
      expect(scenario.endpoint).toBe("/api/users");
      expect(scenario.method).toBe("GET");
      expect(scenario.responseCode).toBe(200);
    });

    it("normalizes method to uppercase", async () => {
      const scenario = await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "post",
      });

      expect(scenario.method).toBe("POST");
    });

    it("throws for full URLs", async () => {
      await expect(
        Scenario.create(integration.id, {
          endpoint: "https://example.com/api",
        })
      ).rejects.toThrow("Full URLs are not allowed");
    });

    it("throws for endpoints not starting with /", async () => {
      await expect(
        Scenario.create(integration.id, {
          endpoint: "api/users",
        })
      ).rejects.toThrow("must start with /");
    });

    it("stores JSON fields as strings", async () => {
      const scenario = await Scenario.create(integration.id, {
        endpoint: "/api/users",
        headers: { "x-api-key": "secret" },
      });

      expect(scenario.headers).toBe('{"x-api-key":"secret"}');
    });
  });

  describe("getById", () => {
    it("returns a scenario by ID", async () => {
      const created = await Scenario.create(integration.id, {
        endpoint: "/api/find",
      });
      const found = await Scenario.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
    });

    it("returns null for missing ID", async () => {
      expect(await Scenario.getById("nope")).toBeNull();
    });
  });

  describe("listByIntegration", () => {
    it("lists all scenarios for an integration", async () => {
      await Scenario.create(integration.id, { endpoint: "/a" });
      await Scenario.create(integration.id, { endpoint: "/b" });

      const list = await Scenario.listByIntegration(integration.id);
      expect(list.length).toBe(2);
    });

    it("returns empty array when none exist", async () => {
      const list = await Scenario.listByIntegration(integration.id);
      expect(list).toEqual([]);
    });
  });

  describe("listByRoute", () => {
    it("lists scenarios matching method and endpoint", async () => {
      await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "GET",
      });
      await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "POST",
      });

      const list = await Scenario.listByRoute(
        integration.id,
        "GET",
        "/api/users"
      );
      expect(list.length).toBe(1);
      expect(list[0].method).toBe("GET");
    });
  });

  describe("update", () => {
    it("updates scenario fields", async () => {
      const created = await Scenario.create(integration.id, {
        endpoint: "/old",
      });
      const updated = await Scenario.update(created.id, {
        endpoint: "/new",
      });

      expect(updated.endpoint).toBe("/new");
      expect(updated.id).toBe(created.id);
    });

    it("updates route index when method changes", async () => {
      const created = await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "GET",
      });

      await Scenario.update(created.id, { method: "POST" });

      const getList = await Scenario.listByRoute(
        integration.id,
        "GET",
        "/api/users"
      );
      expect(getList.length).toBe(0);

      const postList = await Scenario.listByRoute(
        integration.id,
        "POST",
        "/api/users"
      );
      expect(postList.length).toBe(1);
    });

    it("returns null for non-existent ID", async () => {
      expect(await Scenario.update("none", { endpoint: "/x" })).toBeNull();
    });
  });

  describe("delete", () => {
    it("removes the scenario from all indexes", async () => {
      const created = await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "GET",
      });

      await Scenario.delete(created.id);

      expect(await Scenario.getById(created.id)).toBeNull();
      expect(
        await Scenario.listByRoute(integration.id, "GET", "/api/users")
      ).toEqual([]);
    });

    it("returns false for non-existent scenario", async () => {
      expect(await Scenario.delete("none")).toBe(false);
    });
  });

  describe("batchCreate", () => {
    it("creates multiple scenarios at once", async () => {
      const scenarios = await Scenario.batchCreate(integration.id, [
        { endpoint: "/a" },
        { endpoint: "/b", method: "POST" },
      ]);

      expect(scenarios.length).toBe(2);
      expect(scenarios[0].endpoint).toBe("/a");
      expect(scenarios[1].method).toBe("POST");

      const list = await Scenario.listByIntegration(integration.id);
      expect(list.length).toBe(2);
    });

    it("returns empty array for empty input", async () => {
      expect(await Scenario.batchCreate(integration.id, [])).toEqual([]);
    });
  });

  describe("listAll", () => {
    it("lists all scenarios across integrations", async () => {
      const int2 = await Integration.create({ name: "Other" });
      await Scenario.create(integration.id, { endpoint: "/x" });
      await Scenario.create(int2.id, { endpoint: "/y" });

      const all = await Scenario.listAll();
      expect(all.length).toBe(2);
    });

    it("filters by search term", async () => {
      await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "GET",
      });
      await Scenario.create(integration.id, {
        endpoint: "/api/orders",
        method: "POST",
      });

      const results = await Scenario.listAll("users");
      expect(results.length).toBe(1);
      expect(results[0].endpoint).toBe("/api/users");
    });
  });

  describe("findConflicts", () => {
    it("finds conflicting endpoints", async () => {
      await Scenario.create(integration.id, {
        endpoint: "/api/users",
        method: "GET",
      });

      const { conflicts, nonConflicts } = await Scenario.findConflicts(
        integration.id,
        [
          { endpoint: "/api/users", method: "GET" },
          { endpoint: "/api/orders", method: "POST" },
        ]
      );

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].endpoint).toBe("/api/users");
      expect(nonConflicts.length).toBe(1);
      expect(nonConflicts[0].endpoint).toBe("/api/orders");
    });
  });
});

describe("Traffic Model (Redis)", () => {
  let integration;

  beforeEach(async () => {
    integration = await Integration.create({
      name: "Traffic Test",
      key: "traffic-key",
    });
  });

  describe("log", () => {
    it("logs a traffic entry", async () => {
      const entry = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/users",
        headers: { "x-api-key": "secret" },
        query: { page: "1" },
        body: {},
        statusCode: 200,
        responseTime: 42,
      });

      expect(entry.id).toBeDefined();
      expect(entry.method).toBe("GET");
      expect(entry.statusCode).toBe(200);
      expect(entry.timestamp).toBeDefined();
    });

    it("assigns TTL to the entry", async () => {
      const entry = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/users",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const redis = require("../../src/config/redis");
      const ttl = await redis.ttl(`traffic:${entry.id}`);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe("getById", () => {
    it("retrieves a logged entry", async () => {
      const entry = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "POST",
        path: "/api/users",
        headers: { "content-type": "application/json" },
        query: {},
        body: { name: "John" },
        statusCode: 201,
        responseTime: 55,
      });

      const found = await Traffic.getById(entry.id);

      expect(found).not.toBeNull();
      expect(found.method).toBe("POST");
      expect(found.headers).toEqual({ "content-type": "application/json" });
      expect(found.body).toEqual({ name: "John" });
    });

    it("returns null for missing entry", async () => {
      expect(await Traffic.getById("no-such-id")).toBeNull();
    });
  });

  describe("list", () => {
    it("lists traffic in reverse chronological order", async () => {
      const e1 = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });
      await new Promise((r) => setTimeout(r, 50));
      const e2 = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/b",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const list = await Traffic.list();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(e2.id);
      expect(list[1].id).toBe(e1.id);
    });

    it("filters by integrationId", async () => {
      const int2 = await Integration.create({ name: "Other" });
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });
      await Traffic.log({
        integrationKey: "other-key",
        integrationId: int2.id,
        method: "GET",
        path: "/api/b",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const list = await Traffic.list({ integrationId: integration.id });
      expect(list.length).toBe(1);
      expect(list[0].path).toBe("/api/a");
    });

    it("respects limit and offset", async () => {
      for (let i = 0; i < 5; i++) {
        await Traffic.log({
          integrationKey: "traffic-key",
          integrationId: integration.id,
          method: "GET",
          path: `/api/${i}`,
          headers: {},
          query: {},
          body: {},
          statusCode: 200,
          responseTime: 10,
        });
        await new Promise((r) => setTimeout(r, 10));
      }

      const page = await Traffic.list({ limit: 2, offset: 1 });
      expect(page.length).toBe(2);
    });
  });

  describe("count", () => {
    it("counts total traffic", async () => {
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/b",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      expect(await Traffic.count()).toBe(2);
    });

    it("counts traffic per integration", async () => {
      const int2 = await Integration.create({ name: "Other" });
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });
      await Traffic.log({
        integrationKey: "other-key",
        integrationId: int2.id,
        method: "GET",
        path: "/api/b",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      expect(await Traffic.count({ integrationId: integration.id })).toBe(1);
    });
  });

  describe("delete", () => {
    it("removes a traffic entry", async () => {
      const entry = await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/x",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const deleted = await Traffic.delete(entry.id);
      expect(deleted).toBe(true);
      expect(await Traffic.getById(entry.id)).toBeNull();
    });

    it("returns false for missing entry", async () => {
      expect(await Traffic.delete("none")).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears all traffic", async () => {
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const cleared = await Traffic.clear();
      expect(cleared).toBe(1);
      expect(await Traffic.count()).toBe(0);
    });

    it("clears traffic for a specific integration", async () => {
      const int2 = await Integration.create({ name: "Other" });
      await Traffic.log({
        integrationKey: "traffic-key",
        integrationId: integration.id,
        method: "GET",
        path: "/api/a",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });
      await Traffic.log({
        integrationKey: "other-key",
        integrationId: int2.id,
        method: "GET",
        path: "/api/b",
        headers: {},
        query: {},
        body: {},
        statusCode: 200,
        responseTime: 10,
      });

      const cleared = await Traffic.clear({ integrationId: integration.id });
      expect(cleared).toBe(1);
      expect(await Traffic.count({ integrationId: integration.id })).toBe(0);
      expect(await Traffic.count({ integrationId: int2.id })).toBe(1);
    });
  });
});
