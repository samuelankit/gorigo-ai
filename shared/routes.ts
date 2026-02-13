import { z } from "zod";
import { insertUserSchema, users } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  health: {
    get: {
      method: "GET" as const,
      path: "/api/health" as const,
      responses: {
        200: z.object({ ok: z.literal(true) }),
      },
    },
  },
  users: {
    create: {
      method: "POST" as const,
      path: "/api/users" as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }
  return url;
}

export type HealthResponse = z.infer<typeof api.health.get.responses[200]>;
export type CreateUserInput = z.infer<typeof api.users.create.input>;
export type CreateUserResponse = z.infer<typeof api.users.create.responses[201]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
