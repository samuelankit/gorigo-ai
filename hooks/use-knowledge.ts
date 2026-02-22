"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import type { KnowledgeDoc, RAGStats } from "@/components/dashboard/agent/types";

export function useKnowledgeDocs() {
  return useQuery<KnowledgeDoc[]>({
    queryKey: ["/api/knowledge"],
    select: (data: any) => data.documents || [],
  });
}

export function useRagStats() {
  return useQuery<RAGStats>({
    queryKey: ["/api/knowledge/stats"],
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; content: string; sourceType: string }) => {
      const doc = await apiRequest("/api/knowledge", { method: "POST", body: JSON.stringify(body) });
      await apiRequest("/api/knowledge/process", { method: "POST", body: JSON.stringify({ documentId: doc.document.id }) });
      return doc;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
      }, 2000);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/knowledge?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
    },
  });
}

export function useImportAudioUrls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (urls: string[]) =>
      apiRequest("/api/knowledge/import-url", { method: "POST", body: JSON.stringify({ urls }) }),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
        queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
      }, 2000);
    },
  });
}
