const MockService = require("../../src/services/mockService");
const Integration = require("../../src/models/Integration");
const Scenario = require("../../src/models/Scenario");

// Mock the models
jest.mock("../../src/models/Integration");
jest.mock("../../src/models/Scenario");

describe("MockService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("matchScenario", () => {
    const integrationId = "int-123";
    const integrationKey = "mock-abc123";

    const createScenario = (overrides = {}) => {
      const id = `scenario-${overrides.id || Math.random().toString(36).slice(2)}`;
      const {
        headers = {},
        queryParams = {},
        bodyParams = {},
        ...rest
      } = overrides;
      return {
        id,
        integrationId,
        endpoint: "/api/users",
        method: "GET",
        headers: JSON.stringify(headers),
        queryParams: JSON.stringify(queryParams),
        bodyParams: JSON.stringify(bodyParams),
        responseCode: 200,
        responseBody: "{}",
        rateLimit: null,
        rateWindow: null,
        ...rest,
      };
    };

    beforeEach(() => {
      Integration.getByKey.mockResolvedValue({ id: integrationId, key: integrationKey });
    });

    it("returns null when integration does not exist", async () => {
      Integration.getByKey.mockResolvedValue(null);

      const result = await MockService.matchScenario("invalid-key", "/api/users", "GET", {}, {}, {});

      expect(result).toBeNull();
      expect(Integration.getByKey).toHaveBeenCalledWith("invalid-key");
      expect(Scenario.listByRoute).not.toHaveBeenCalled();
    });

    it("returns null when no scenarios exist for integration", async () => {
      Scenario.listByRoute.mockResolvedValue([]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "GET", {}, {}, {});

      expect(result).toBeNull();
      expect(Scenario.listByRoute).toHaveBeenCalledWith(integrationId, "GET", "/api/users");
    });

    it("matches a simple scenario with exact method and endpoint", async () => {
      const scenario = createScenario({ id: "1" });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "GET", {}, {}, {});

      expect(result).not.toBeNull();
      expect(result.id).toBe(scenario.id);
      expect(result.endpoint).toBe("/api/users");
      expect(result.method).toBe("GET");
    });

    it("is case-insensitive for method matching (converts to uppercase)", async () => {
      const scenario = createScenario({ id: "1", method: "POST" });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "post", {}, {}, {});

      expect(result).not.toBeNull();
      expect(result.method).toBe("POST");
    });

    it("does not match when method differs", async () => {
      // listByRoute filters by method+endpoint, so POST returns empty when only GET exists
      Scenario.listByRoute.mockResolvedValue([]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "POST", {}, {}, {});

      expect(result).toBeNull();
    });

    it("does not match when endpoint differs", async () => {
      // listByRoute filters by method+endpoint, so different endpoint returns empty
      Scenario.listByRoute.mockResolvedValue([]);

      const result = await MockService.matchScenario(integrationKey, "/api/products", "GET", {}, {}, {});

      expect(result).toBeNull();
    });

    it("matches scenario with header criteria when all headers match", async () => {
      const scenario = createScenario({
        id: "1",
        headers: { "content-type": "application/json" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        { "content-type": "application/json" },
        {},
        {}
      );

      expect(result).not.toBeNull();
    });

    it("does not match scenario when header criteria are not satisfied", async () => {
      const scenario = createScenario({
        id: "1",
        headers: { "content-type": "application/json" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        { "content-type": "text/plain" },
        {},
        {}
      );

      expect(result).toBeNull();
    });

    it("matches scenario with query param criteria when all query params match", async () => {
      const scenario = createScenario({
        id: "1",
        queryParams: { page: "1", limit: "10" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        {},
        { page: "1", limit: "10" },
        {}
      );

      expect(result).not.toBeNull();
    });

    it("does not match scenario when query param criteria are not satisfied", async () => {
      const scenario = createScenario({
        id: "1",
        queryParams: { page: "1" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        {},
        { page: "2" },
        {}
      );

      expect(result).toBeNull();
    });

    it("matches scenario with body params for POST requests", async () => {
      const scenario = createScenario({
        id: "1",
        method: "POST",
        bodyParams: { name: "John", age: "30" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "POST",
        {},
        {},
        { name: "John", age: 30 }
      );

      expect(result).not.toBeNull();
    });

    it("ignores body params for GET requests", async () => {
      const scenario = createScenario({
        id: "1",
        method: "GET",
        bodyParams: { name: "John" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        {},
        {},
        {}
      );

      // Body params are ignored for GET, so it should match
      expect(result).not.toBeNull();
    });

    it("does not match scenario when body params are missing for POST", async () => {
      const scenario = createScenario({
        id: "1",
        method: "POST",
        bodyParams: { name: "John" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "POST",
        {},
        {},
        {}
      );

      expect(result).toBeNull();
    });

    it("uses string comparison for body param values", async () => {
      const scenario = createScenario({
        id: "1",
        method: "POST",
        bodyParams: { age: "30" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      // Pass age as a number - should still match because of String() coercion
      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "POST",
        {},
        {},
        { age: 30 }
      );

      expect(result).not.toBeNull();
    });

    it("selects the most specific match (highest criteria count)", async () => {
      const genericScenario = createScenario({
        id: "generic",
        endpoint: "/api/users",
        method: "GET",
      });

      const specificScenario = createScenario({
        id: "specific",
        endpoint: "/api/users",
        method: "GET",
        headers: { "x-api-key": "secret123" },
        queryParams: { version: "v1" },
      });

      Scenario.listByRoute.mockResolvedValue([genericScenario, specificScenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        { "x-api-key": "secret123" },
        { version: "v1" },
        {}
      );

      expect(result).not.toBeNull();
      expect(result.id).toBe("specific");
    });

    it("selects generic match when specific criteria are not fully satisfied", async () => {
      const genericScenario = createScenario({
        id: "generic",
        endpoint: "/api/users",
        method: "GET",
      });

      const specificScenario = createScenario({
        id: "specific",
        endpoint: "/api/users",
        method: "GET",
        headers: { "x-api-key": "secret123" },
        queryParams: { version: "v1" },
      });

      Scenario.listByRoute.mockResolvedValue([genericScenario, specificScenario]);

      // Only one of two criteria matches for specific - so it should not be eligible
      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        { "x-api-key": "secret123" },
        {},
        {}
      );

      expect(result).not.toBeNull();
      expect(result.id).toBe("generic");
    });

    it("parses rate limit and rate window as integers", async () => {
      const scenario = createScenario({
        id: "1",
        rateLimit: "100",
        rateWindow: "60000",
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "GET", {}, {}, {});

      expect(result).not.toBeNull();
      expect(result.rateLimit).toBe(100);
      expect(result.rateWindow).toBe(60000);
    });

    it("returns null rate limit when not set", async () => {
      const scenario = createScenario({ id: "1", rateLimit: null, rateWindow: null });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(integrationKey, "/api/users", "GET", {}, {}, {});

      expect(result).not.toBeNull();
      expect(result.rateLimit).toBeNull();
      expect(result.rateWindow).toBeNull();
    });

    it("handles headers case-insensitively by lowercasing the key", async () => {
      const scenario = createScenario({
        id: "1",
        headers: { "X-Custom-Header": "value" },
      });
      Scenario.listByRoute.mockResolvedValue([scenario]);

      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        { "x-custom-header": "value" },
        {},
        {}
      );

      expect(result).not.toBeNull();
    });

    it("returns the first matching scenario when scores are equal", async () => {
      const scenario1 = createScenario({ id: "1", queryParams: { a: "1" } });
      const scenario2 = createScenario({ id: "2", queryParams: { b: "2" } });

      Scenario.listByRoute.mockResolvedValue([scenario1, scenario2]);

      // Only scenario1's criteria match
      const result = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "GET",
        {},
        { a: "1" },
        {}
      );

      expect(result).not.toBeNull();
      expect(result.id).toBe("1");
    });

    it("correctly handles PUT and PATCH body params", async () => {
      const putScenario = createScenario({
        id: "1",
        method: "PUT",
        bodyParams: { status: "active" },
      });
      const patchScenario = createScenario({
        id: "2",
        method: "PATCH",
        bodyParams: { status: "inactive" },
      });

      Scenario.listByRoute.mockResolvedValue([putScenario, patchScenario]);

      const putResult = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "PUT",
        {},
        {},
        { status: "active" }
      );

      expect(putResult).not.toBeNull();
      expect(putResult.id).toBe("1");

      const patchResult = await MockService.matchScenario(
        integrationKey,
        "/api/users",
        "PATCH",
        {},
        {},
        { status: "inactive" }
      );

      expect(patchResult).not.toBeNull();
      expect(patchResult.id).toBe("2");
    });
  });
});
