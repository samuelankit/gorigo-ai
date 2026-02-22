"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const url = typeof queryKey[0] === "string" ? queryKey[0] : "";
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${res.status}`);
    (error as any).status = res.status;
    (error as any).details = body.details;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryFn: defaultQueryFn,
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
