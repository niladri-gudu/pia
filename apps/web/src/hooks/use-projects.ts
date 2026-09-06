"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchProject,
  fetchProjectSyncStatus,
  fetchProjects,
  startProjectSync,
  askProjectAgent,
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

export function useAskProjectAgent(projectId: string) {
  return useMutation({
    mutationFn: (question: string) => askProjectAgent(projectId, question),
  });
}
