const VALID_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

const ENV_VAR_PATTERN = /\{\{[^}]+\}\}/g;

class PostmanImportService {
  static validateCollection(json) {
    if (!json || typeof json !== "object") {
      throw new Error("Invalid JSON: expected an object");
    }
    if (!json.info) {
      throw new Error("Invalid Postman collection: missing 'info' field");
    }
    if (!json.info.name) {
      throw new Error("Invalid Postman collection: missing collection name");
    }
    if (!json.info.schema) {
      throw new Error("Invalid Postman collection: missing schema version");
    }
    const schema = json.info.schema;
    if (!schema.includes("v2")) {
      throw new Error(`Unsupported Postman collection schema: ${schema}. Only v2.x is supported.`);
    }
    return true;
  }

  static extractCollectionInfo(json) {
    return {
      name: json.info.name || "Untitled Collection",
      description: json.info.description || "",
      schema: json.info.schema,
    };
  }

  static parseUrl(urlObj) {
    if (!urlObj) return "/";

    if (typeof urlObj === "string") {
      try {
        const parsed = new URL(urlObj);
        return parsed.pathname || "/";
      } catch {
        let path = urlObj.startsWith("/") ? urlObj : "/" + urlObj;
        path = path.replace(/^https?:\/\/[^/]+/i, "");
        return path.startsWith("/") ? path : "/" + path;
      }
    }

    let path = "/";
    if (urlObj.path) {
      path = Array.isArray(urlObj.path) ? urlObj.path.join("/") : urlObj.path;
      if (!path.startsWith("/")) path = "/" + path;
    } else if (urlObj.host) {
      const host = Array.isArray(urlObj.host) ? urlObj.host.join(".") : urlObj.host;
      path = urlObj.pathname || "/";
    }

    path = path.replace(/^https?:\/\/[^/]+/i, "");
    return path || "/";
  }

  static extractHeaders(request) {
    const headers = {};
    if (request.header && Array.isArray(request.header)) {
      request.header.forEach((h) => {
        if (h.key && h.enabled !== false) {
          headers[h.key] = h.value || "";
        }
      });
    }
    return headers;
  }

  static extractQueryParams(urlObj) {
    const params = {};
    if (urlObj && urlObj.query && Array.isArray(urlObj.query)) {
      urlObj.query.forEach((q) => {
        if (q.key && q.enabled !== false) {
          params[q.key] = q.value || "";
        }
      });
    }
    return params;
  }

  static extractRequestBody(request) {
    const bodyParams = {};
    if (!request.body) return bodyParams;

    const body = request.body;

    if (body.mode === "raw" && body.raw) {
      try {
        const parsed = JSON.parse(body.raw);
        Object.keys(parsed).forEach((key) => {
          bodyParams[key] = typeof parsed[key] === "object" ? JSON.stringify(parsed[key]) : String(parsed[key]);
        });
      } catch {
        bodyParams["_raw"] = body.raw;
      }
    }

    if (body.mode === "urlencoded" && body.urlencoded && Array.isArray(body.urlencoded)) {
      body.urlencoded.forEach((field) => {
        if (field.key && field.enabled !== false) {
          bodyParams[field.key] = field.value || "";
        }
      });
    }

    if (body.mode === "formdata" && body.formdata && Array.isArray(body.formdata)) {
      body.formdata.forEach((field) => {
        if (field.key && field.enabled !== false) {
          bodyParams[field.key] = field.value || (field.type === "file" ? "[file]" : "");
        }
      });
    }

    return bodyParams;
  }

  static extractResponseBody(item) {
    if (!item.response || !Array.isArray(item.response) || item.response.length === 0) {
      return { responseCode: 200, responseBody: "{}" };
    }

    const examples = item.response.map((resp, index) => {
      let body = "{}";
      try {
        if (resp.body) {
          JSON.parse(resp.body);
          body = resp.body;
        }
      } catch {
        body = JSON.stringify({ message: resp.body || "" });
      }

      return {
        id: `example_${index}`,
        name: resp.name || `Response ${index + 1}`,
        status: resp.status || "",
        code: resp.code || 200,
        body,
        headers: resp.header ? PostmanImportService.extractHeaders({ header: resp.header }) : {},
      };
    });

    return {
      responseCode: examples[0]?.code || 200,
      responseBody: examples[0]?.body || "{}",
      examples,
    };
  }

  static detectEnvVariables(text) {
    if (!text) return [];
    const matches = text.match(ENV_VAR_PATTERN);
    return matches ? [...new Set(matches)] : [];
  }

  static extractItem(item, parentPath = "", folderName = "") {
    const results = [];

    if (item.item && Array.isArray(item.item)) {
      const currentFolder = item.name || folderName;
      item.item.forEach((child) => {
        results.push(...PostmanImportService.extractItem(child, parentPath, currentFolder));
      });
      return results;
    }

    if (!item.request) return results;

    const request = typeof item.request === "object" ? item.request : { url: item.request };
    const method = (request.method || "GET").toUpperCase();

    if (!VALID_METHODS.includes(method)) {
      return results;
    }

    const rawPath = PostmanImportService.parseUrl(request.url);
    const endpoint = rawPath;

    const headers = PostmanImportService.extractHeaders(request);
    const queryParams = PostmanImportService.extractQueryParams(request.url);
    const bodyParams = PostmanImportService.extractRequestBody(request);
    const { responseCode, responseBody, examples } = PostmanImportService.extractResponseBody(item);

    const envVars = [];
    if (request.url) {
      envVars.push(...PostmanImportService.detectEnvVariables(typeof request.url === "string" ? request.url : JSON.stringify(request.url)));
    }
    Object.values(headers).forEach((v) => envVars.push(...PostmanImportService.detectEnvVariables(v)));
    Object.values(bodyParams).forEach((v) => envVars.push(...PostmanImportService.detectEnvVariables(v)));

    results.push({
      id: item.id || item.name || endpoint,
      name: item.name || `${method} ${endpoint}`,
      description: item.description || request.description || "",
      method,
      endpoint,
      headers,
      queryParams,
      bodyParams,
      responseCode,
      responseBody,
      examples: examples || [],
      folder: folderName || null,
      envVariables: [...new Set(envVars)],
    });

    return results;
  }

  static parseCollection(json) {
    PostmanImportService.validateCollection(json);

    const info = PostmanImportService.extractCollectionInfo(json);
    const items = json.item || [];
    const endpoints = [];

    items.forEach((item) => {
      endpoints.push(...PostmanImportService.extractItem(item));
    });

    return {
      info,
      endpoints,
      totalEndpoints: endpoints.length,
      hasEnvVariables: endpoints.some((e) => e.envVariables.length > 0),
    };
  }

  static normalizeEndpoint(endpoint) {
    let path = endpoint;
    path = path.replace(ENV_VAR_PATTERN, (match) => match.replace(/\{\{|\}\}/g, "").toUpperCase());
    path = path.replace(/\/+/g, "/");
    if (!path.startsWith("/")) path = "/" + path;
    return path;
  }
}

module.exports = PostmanImportService;
