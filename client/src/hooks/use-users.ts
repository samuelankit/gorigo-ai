import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateUserInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const validated = api.users.create.input.parse(input);

      const res = await fetch(api.users.create.path, {
        method: api.users.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errJson = await res.json().catch(() => ({}));
          const parsed = parseWithLogging(api.users.create.responses[400], errJson, "users.create.400");
          throw new Error(parsed.field ? `${parsed.field}: ${parsed.message}` : parsed.message);
        }

        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to create user");
      }

      const json = await res.json();
      return parseWithLogging(api.users.create.responses[201], json, "users.create.201");
    },
    onSuccess: async () => {
      // No list endpoint yet, but keep the pattern: invalidate health to visually confirm server still ok.
      await queryClient.invalidateQueries({ queryKey: [api.health.get.path] });
    },
  });
}
