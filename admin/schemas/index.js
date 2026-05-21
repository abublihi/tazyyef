import { z } from "zod";

export const integrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  key: z.string().optional().or(z.literal("")),
});

export const scenarioSchema = z.object({
  integrationId: z.string().min(1, "Integration is required"),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
  endpoint: z
    .string()
    .min(1, "Endpoint is required")
    .refine((val) => {
      if (/^https?:\/\//i.test(val)) return false;
      return val.startsWith("/");
    }, "Endpoint must be a path starting with /"),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  bodyParams: z.record(z.string(), z.string()).optional(),
  responseCode: z.coerce.number().min(100).max(599).default(200),
  responseBody: z.string().default("{}"),
  rateLimit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  rateWindow: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1000).optional()
  ),
});
