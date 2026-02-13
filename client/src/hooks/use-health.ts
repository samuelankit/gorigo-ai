import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useHealth() {
  return useQuery({
    queryKey: [api.health.get.path],
    queryFn: async () => {
      const res = await fetch(api.health.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Health check failed");
      const json = await res.json();
      return parseWithLogging(api.health.get.responses[200], json, "health.get");
    },
    refetchInterval: 30_000,
  });
}
