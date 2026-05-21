const { z } = require("zod");

// Validate that a JSON string field is valid JSON
function validateJsonField(fieldName) {
  return (req, res, next) => {
    const value = req.body[fieldName];
    if (value === undefined || value === null) return next();

    if (typeof value === "object") return next();

    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return next();
      } catch {
        return res.status(400).json({ error: `${fieldName} must be valid JSON` });
      }
    }

    res.status(400).json({ error: `${fieldName} must be a JSON object or JSON string` });
  };
}

// Validate request body against a Zod schema
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors[0]?.message || "Invalid request body";
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const integrationCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().default(""),
  key: z.string().max(100).optional(),
});

const integrationUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional(),
  key: z.string().max(100).optional(),
});

const scenarioCreateSchema = z.object({
  method: z.enum(HTTP_METHODS, { message: "Invalid HTTP method" }),
  endpoint: z
    .string()
    .min(1, "Endpoint is required")
    .refine((v) => v.startsWith("/"), "Endpoint must start with /"),
  headers: z.union([z.string(), z.record(z.unknown())]).optional(),
  queryParams: z.union([z.string(), z.record(z.unknown())]).optional(),
  bodyParams: z.union([z.string(), z.record(z.unknown())]).optional(),
  responseCode: z
    .number({ coerce: true })
    .int()
    .min(100, "Response code must be >= 100")
    .max(599, "Response code must be <= 599")
    .default(200),
  responseBody: z
    .string()
    .optional()
    .default("{}")
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "responseBody must be valid JSON" }
    ),
  rateLimit: z.number({ coerce: true }).int().positive().optional().nullable(),
  rateWindow: z.number({ coerce: true }).int().positive().optional().nullable(),
  source: z.string().optional(),
});

const scenarioUpdateSchema = scenarioCreateSchema.partial();

module.exports = {
  validateJsonField,
  validateBody,
  integrationCreateSchema,
  integrationUpdateSchema,
  scenarioCreateSchema,
  scenarioUpdateSchema,
};
