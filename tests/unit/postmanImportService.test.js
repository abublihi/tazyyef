const PostmanImportService = require("../../src/services/postmanImportService");

describe("PostmanImportService", () => {
  describe("validateCollection", () => {
    it("throws error for null input", () => {
      expect(() => PostmanImportService.validateCollection(null)).toThrow(
        "Invalid JSON: expected an object"
      );
    });

    it("throws error for non-object input", () => {
      expect(() => PostmanImportService.validateCollection("string")).toThrow(
        "Invalid JSON: expected an object"
      );
    });

    it("throws error when info field is missing", () => {
      expect(() => PostmanImportService.validateCollection({})).toThrow(
        "Invalid Postman collection: missing 'info' field"
      );
    });

    it("throws error when collection name is missing", () => {
      expect(() =>
        PostmanImportService.validateCollection({ info: {} })
      ).toThrow("Invalid Postman collection: missing collection name");
    });

    it("throws error when schema version is missing", () => {
      expect(() =>
        PostmanImportService.validateCollection({ info: { name: "Test" } })
      ).toThrow("Invalid Postman collection: missing schema version");
    });

    it("throws error for unsupported schema version", () => {
      expect(() =>
        PostmanImportService.validateCollection({
          info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v1.0.0" },
        })
      ).toThrow("Unsupported Postman collection schema");
    });

    it("passes validation for v2 schema", () => {
      const result = PostmanImportService.validateCollection({
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.0.0" },
      });
      expect(result).toBe(true);
    });

    it("passes validation for v2.1 schema", () => {
      const result = PostmanImportService.validateCollection({
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0" },
      });
      expect(result).toBe(true);
    });
  });

  describe("extractCollectionInfo", () => {
    it("extracts basic collection info", () => {
      const json = {
        info: {
          name: "My API",
          description: "Test API",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0",
        },
      };

      const result = PostmanImportService.extractCollectionInfo(json);

      expect(result).toEqual({
        name: "My API",
        description: "Test API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0",
      });
    });

    it("uses defaults for missing fields", () => {
      const json = {
        info: {
          name: "",
          schema: "v2.0.0",
        },
      };

      const result = PostmanImportService.extractCollectionInfo(json);

      expect(result).toEqual({
        name: "Untitled Collection",
        description: "",
        schema: "v2.0.0",
      });
    });
  });

  describe("parseUrl", () => {
    it("returns '/' for null url", () => {
      expect(PostmanImportService.parseUrl(null)).toBe("/");
    });

    it("parses a simple URL string", () => {
      expect(PostmanImportService.parseUrl("https://api.example.com/users")).toBe("/users");
    });

    it("handles URL string without protocol", () => {
      expect(PostmanImportService.parseUrl("/users?page=1")).toBe("/users?page=1");
    });

    it("handles URL string without leading slash", () => {
      expect(PostmanImportService.parseUrl("users?page=1")).toBe("/users?page=1");
    });

    it("parses URL object with path array", () => {
      const urlObj = { path: ["api", "v1", "users"] };
      expect(PostmanImportService.parseUrl(urlObj)).toBe("/api/v1/users");
    });

    it("parses URL object with string path", () => {
      const urlObj = { path: "/api/v1/users" };
      expect(PostmanImportService.parseUrl(urlObj)).toBe("/api/v1/users");
    });

    it("strips protocol and host from URL object", () => {
      const urlObj = { host: ["api", "example", "com"], pathname: "/users" };
      expect(PostmanImportService.parseUrl(urlObj)).toBe("/users");
    });

    it("handles empty path gracefully", () => {
      const urlObj = { path: [] };
      expect(PostmanImportService.parseUrl(urlObj)).toBe("/");
    });
  });

  describe("extractHeaders", () => {
    it("extracts enabled headers", () => {
      const request = {
        header: [
          { key: "Content-Type", value: "application/json", enabled: true },
          { key: "Authorization", value: "Bearer token", enabled: true },
        ],
      };

      const result = PostmanImportService.extractHeaders(request);

      expect(result).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      });
    });

    it("skips disabled headers", () => {
      const request = {
        header: [
          { key: "Content-Type", value: "application/json", enabled: false },
          { key: "Authorization", value: "Bearer token", enabled: true },
        ],
      };

      const result = PostmanImportService.extractHeaders(request);

      expect(result).toEqual({
        Authorization: "Bearer token",
      });
    });

    it("skips headers without a key", () => {
      const request = {
        header: [
          { key: "", value: "application/json" },
          { key: "Authorization", value: "Bearer token" },
        ],
      };

      const result = PostmanImportService.extractHeaders(request);

      expect(result).toEqual({
        Authorization: "Bearer token",
      });
    });

    it("returns empty object when header is missing", () => {
      const result = PostmanImportService.extractHeaders({});
      expect(result).toEqual({});
    });

    it("returns empty object when header is not an array", () => {
      const result = PostmanImportService.extractHeaders({ header: "not-array" });
      expect(result).toEqual({});
    });
  });

  describe("extractQueryParams", () => {
    it("extracts query parameters from URL object", () => {
      const urlObj = {
        query: [
          { key: "page", value: "1", enabled: true },
          { key: "limit", value: "10", enabled: true },
        ],
      };

      const result = PostmanImportService.extractQueryParams(urlObj);

      expect(result).toEqual({ page: "1", limit: "10" });
    });

    it("skips disabled query parameters", () => {
      const urlObj = {
        query: [
          { key: "page", value: "1", enabled: false },
          { key: "limit", value: "10", enabled: true },
        ],
      };

      const result = PostmanImportService.extractQueryParams(urlObj);

      expect(result).toEqual({ limit: "10" });
    });

    it("returns empty object for null url", () => {
      expect(PostmanImportService.extractQueryParams(null)).toEqual({});
    });

    it("returns empty object when query is not an array", () => {
      expect(PostmanImportService.extractQueryParams({ query: "not-array" })).toEqual({});
    });
  });

  describe("extractRequestBody", () => {
    it("extracts raw JSON body", () => {
      const request = {
        body: {
          mode: "raw",
          raw: '{"name": "John", "age": 30}',
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({ name: "John", age: "30" });
    });

    it("handles nested objects in raw JSON", () => {
      const request = {
        body: {
          mode: "raw",
          raw: '{"user": {"name": "John"}, "tags": ["a", "b"]}',
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({
        user: '{"name":"John"}',
        tags: '["a","b"]',
      });
    });

    it("stores raw text as _raw when not valid JSON", () => {
      const request = {
        body: {
          mode: "raw",
          raw: "just some text",
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({ _raw: "just some text" });
    });

    it("extracts urlencoded body", () => {
      const request = {
        body: {
          mode: "urlencoded",
          urlencoded: [
            { key: "name", value: "John", enabled: true },
            { key: "age", value: "30", enabled: true },
          ],
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({ name: "John", age: "30" });
    });

    it("extracts formdata body", () => {
      const request = {
        body: {
          mode: "formdata",
          formdata: [
            { key: "file", type: "file", enabled: true },
            { key: "name", value: "John", enabled: true },
          ],
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({ file: "[file]", name: "John" });
    });

    it("returns empty object when body is missing", () => {
      const result = PostmanImportService.extractRequestBody({});
      expect(result).toEqual({});
    });

    it("skips disabled urlencoded fields", () => {
      const request = {
        body: {
          mode: "urlencoded",
          urlencoded: [
            { key: "name", value: "John", enabled: false },
            { key: "age", value: "30", enabled: true },
          ],
        },
      };

      const result = PostmanImportService.extractRequestBody(request);

      expect(result).toEqual({ age: "30" });
    });
  });

  describe("extractResponseBody", () => {
    it("returns defaults when no responses exist", () => {
      const item = {};
      const result = PostmanImportService.extractResponseBody(item);

      expect(result).toEqual({
        responseCode: 200,
        responseBody: "{}",
      });
    });

    it("extracts response from array", () => {
      const item = {
        response: [
          {
            name: "Success",
            status: "OK",
            code: 200,
            body: '{"id": 1}',
            header: [{ key: "Content-Type", value: "application/json" }],
          },
        ],
      };

      const result = PostmanImportService.extractResponseBody(item);

      expect(result.responseCode).toBe(200);
      expect(result.responseBody).toBe('{"id": 1}');
      expect(result.examples).toHaveLength(1);
      expect(result.examples[0]).toMatchObject({
        id: "example_0",
        name: "Success",
        status: "OK",
        code: 200,
        body: '{"id": 1}',
      });
    });

    it("stringifies non-JSON response body", () => {
      const item = {
        response: [
          {
            code: 200,
            body: "plain text response",
          },
        ],
      };

      const result = PostmanImportService.extractResponseBody(item);

      expect(result.responseBody).toBe('{"message":"plain text response"}');
    });

    it("uses empty string when body is missing", () => {
      const item = {
        response: [
          {
            code: 204,
          },
        ],
      };

      const result = PostmanImportService.extractResponseBody(item);

      expect(result.responseBody).toBe("{}");
    });
  });

  describe("detectEnvVariables", () => {
    it("detects {{variable}} patterns", () => {
      const result = PostmanImportService.detectEnvVariables("{{base_url}}/users/{{user_id}}");
      expect(result).toEqual(["{{base_url}}", "{{user_id}}"]);
    });

    it("returns unique variables only", () => {
      const result = PostmanImportService.detectEnvVariables("{{base_url}}/users/{{base_url}}");
      expect(result).toEqual(["{{base_url}}"]);
    });

    it("returns empty array for null input", () => {
      expect(PostmanImportService.detectEnvVariables(null)).toEqual([]);
    });

    it("returns empty array for text without variables", () => {
      expect(PostmanImportService.detectEnvVariables("/api/users")).toEqual([]);
    });
  });

  describe("extractItem", () => {
    it("extracts a simple request item", () => {
      const item = {
        id: "req-1",
        name: "Get Users",
        request: {
          method: "GET",
          url: "https://api.example.com/users",
        },
        response: [
          {
            code: 200,
            body: '{"users": []}',
          },
        ],
      };

      const results = PostmanImportService.extractItem(item);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: "req-1",
        name: "Get Users",
        method: "GET",
        endpoint: "/users",
        responseCode: 200,
        responseBody: '{"users": []}',
        folder: null,
      });
    });

    it("extracts nested folder items", () => {
      const folder = {
        name: "User API",
        item: [
          {
            id: "req-1",
            name: "Get User",
            request: { method: "GET", url: "/users/1" },
          },
          {
            id: "req-2",
            name: "Create User",
            request: { method: "POST", url: "/users" },
          },
        ],
      };

      const results = PostmanImportService.extractItem(folder);

      expect(results).toHaveLength(2);
      expect(results[0].folder).toBe("User API");
      expect(results[1].folder).toBe("User API");
    });

    it("skips items with unsupported HTTP methods", () => {
      const item = {
        id: "req-1",
        name: "Custom Method",
        request: {
          method: "CUSTOM",
          url: "/users",
        },
      };

      const results = PostmanImportService.extractItem(item);

      expect(results).toHaveLength(0);
    });

    it("detects environment variables in headers and body", () => {
      const item = {
        id: "req-1",
        name: "Get Users",
        request: {
          method: "GET",
          url: "{{base_url}}/users",
          header: [
            { key: "Authorization", value: "Bearer {{token}}", enabled: true },
          ],
        },
        response: [],
      };

      const results = PostmanImportService.extractItem(item);

      expect(results[0].envVariables).toContain("{{base_url}}");
      expect(results[0].envVariables).toContain("{{token}}");
    });

    it("handles request as a string URL", () => {
      const item = {
        id: "req-1",
        name: "Simple Request",
        request: "https://api.example.com/users",
      };

      const results = PostmanImportService.extractItem(item);

      expect(results).toHaveLength(1);
      expect(results[0].endpoint).toBe("/users");
      expect(results[0].method).toBe("GET");
    });

    it("uses default name when item name is missing", () => {
      const item = {
        id: "req-1",
        request: {
          method: "GET",
          url: "/users",
        },
      };

      const results = PostmanImportService.extractItem(item);

      expect(results[0].name).toBe("GET /users");
    });
  });

  describe("parseCollection", () => {
    it("parses a complete Postman collection", () => {
      const collection = {
        info: {
          name: "Test API",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0",
        },
        item: [
          {
            name: "Users",
            item: [
              {
                id: "req-1",
                name: "Get Users",
                request: {
                  method: "GET",
                  url: "https://api.example.com/users",
                },
                response: [
                  {
                    code: 200,
                    body: '{"users": []}',
                  },
                ],
              },
            ],
          },
          {
            id: "req-2",
            name: "Get Products",
            request: {
              method: "GET",
              url: "/products",
            },
            response: [],
          },
        ],
      };

      const result = PostmanImportService.parseCollection(collection);

      expect(result.info.name).toBe("Test API");
      expect(result.totalEndpoints).toBe(2);
      expect(result.endpoints).toHaveLength(2);
      expect(result.hasEnvVariables).toBe(false);
    });

    it("identifies collections with environment variables", () => {
      const collection = {
        info: {
          name: "Test API",
          schema: "v2.0.0",
        },
        item: [
          {
            id: "req-1",
            name: "Get Users",
            request: {
              method: "GET",
              url: "{{base_url}}/users",
            },
            response: [],
          },
        ],
      };

      const result = PostmanImportService.parseCollection(collection);

      expect(result.hasEnvVariables).toBe(true);
    });
  });

  describe("normalizeEndpoint", () => {
    it("replaces {{env}} variables with uppercase placeholders", () => {
      expect(PostmanImportService.normalizeEndpoint("/users/{{user_id}}")).toBe("/users/USER_ID");
    });

    it("removes duplicate slashes", () => {
      expect(PostmanImportService.normalizeEndpoint("/api//v1///users")).toBe("/api/v1/users");
    });

    it("adds leading slash if missing", () => {
      expect(PostmanImportService.normalizeEndpoint("api/users")).toBe("/api/users");
    });

    it("returns root path for empty string", () => {
      expect(PostmanImportService.normalizeEndpoint("")).toBe("/");
    });
  });
});
