"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import type { FlowRecord, FlowNode, FlowEdge } from "@/components/dashboard/agent/types";

export function useFlows() {
  return useQuery<{ flows: FlowRecord[]; activeFlow: FlowRecord | null }>({
    queryKey: ["/api/flows"],
    select: (data: any) => ({
      flows: (data.flows || []) as FlowRecord[],
      activeFlow: data.activeFlow || null,
    }),
  });
}

export function useSaveFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { id?: number; name: string; nodes: FlowNode[]; edges: FlowEdge[]; isActive: boolean }) => {
      if (body.id) {
        return apiRequest("/api/flows", { method: "PUT", body: JSON.stringify(body) });
      }
      return apiRequest("/api/flows", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/flows"] }),
  });
}
