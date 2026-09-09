"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createConversation,
  fetchConversationMessages,
  fetchProject,
  fetchProjectConversations,
  fetchProjectSyncStatus,
  fetchProjects,
  searchProject,
  sendConversationMessage,
  startProjectSync,
} from "@/lib/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectSyncStatus(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "sync-status"],
    queryFn: () => fetchProjectSyncStatus(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status === "COMPLETED" || status === "FAILED") {
        return false;
      }

      return 2_000;
    },
  });
}

export function useStartProjectSync(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startProjectSync(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["projects", projectId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "sync-status"],
      });
    },
  });
}

export function useProjectSearch(projectId: string, query: string) {
  return useQuery({
    queryKey: ["projects", projectId, "search", query],
    queryFn: () => searchProject(projectId, query),
    enabled: Boolean(projectId && query.trim()),
  });
}

export function useCreateConversation(projectId: string) {
  return useMutation({
    mutationFn: (title?: string) => createConversation(projectId, title),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversations", conversationId, "messages"],
    queryFn: () => fetchConversationMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useSendConversationMessage(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }

      return sendConversationMessage(conversationId, content);
    },
    onSuccess: () => {
      if (!conversationId) {
        return;
      }

      // Invalidating the "conversations" prefix refreshes both this
      // conversation's messages and the sidebar list (auto titles update
      // on the first exchange).
      void queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}

export function useProjectConversations(projectId: string) {
  return useQuery({
    queryKey: ["conversations", projectId],
    queryFn: () => fetchProjectConversations(projectId),
  });
}
