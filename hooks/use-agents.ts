"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import type { AgentRecord, FaqEntry } from "@/components/dashboard/agent/types";

function mapAgent(a: any): AgentRecord {
  return {
    id: a.id,
    name: a.name || "",
    greeting: a.greeting || "",
    businessDescription: a.businessDescription || "",
    inboundEnabled: a.inboundEnabled ?? true,
    outboundEnabled: a.outboundEnabled ?? false,
    roles: a.roles || "specialist",
    faqEntries: (a.faqEntries as FaqEntry[]) || [],
    handoffNumber: a.handoffNumber || "",
    handoffTrigger: a.handoffTrigger || "transfer",
    voicePreference: a.voicePreference || "professional",
    negotiationEnabled: a.negotiationEnabled ?? false,
    negotiationGuardrails: a.negotiationGuardrails as any,
    complianceDisclosure: a.complianceDisclosure ?? true,
    agentType: a.agentType || "general",
    departmentName: a.departmentName || null,
    isRouter: a.isRouter ?? false,
    systemPrompt: a.systemPrompt || null,
    escalationRules: a.escalationRules || null,
    status: a.status || "active",
    displayOrder: a.displayOrder ?? 0,
    language: a.language || null,
    voiceName: a.voiceName || null,
    speechModel: a.speechModel || null,
  };
}

export function useAgents() {
  return useQuery<AgentRecord[]>({
    queryKey: ["/api/agents/multi"],
    select: (data: any) => (data.agents || []).map(mapAgent),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("/api/agents/multi", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents/multi"] }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("/api/agents/multi", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents/multi"] }),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/agents/multi?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents/multi"] }),
  });
}

export function useVoices() {
  return useQuery<{ voices: Array<{id: string; name: string; language: string; gender: string}>; languages: Array<{code: string; name: string}> }>({
    queryKey: ["/api/voices"],
  });
}

export function useTestChat() {
  return useMutation({
    mutationFn: (body: { agentId: number; message: string; history: Array<{ role: string; content: string }> }) =>
      apiRequest("/api/agents/test-chat", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest("/api/drafts/generate", { method: "POST", body: JSON.stringify(body) }),
  });
}
