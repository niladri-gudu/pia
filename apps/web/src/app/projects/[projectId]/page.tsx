"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ChatTab } from "@/components/workspace-tabs";
import { ProjectHeader } from "@/components/project-header";
import { ProjectChat } from "@/components/project-chat";
import { ProjectSearch } from "@/components/project-search";
import { ErrorState, LoadingSkeleton } from "@/components/states";
import { useProject, useProjectSyncStatus, useStartProjectSync } from "@/hooks/use-projects";

type WorkspaceTab = "chat" | "search";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");

  const syncStatus = useProjectSyncStatus(projectId);
  const startSync = useStartProjectSync(projectId);
  const { data: project, isLoading, isError } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2.5 sm:px-6">
          <LoadingSkeleton className="size-7 rounded-lg" />
          <LoadingSkeleton className="h-4 w-40" />
          <div className="flex-1" />
          <LoadingSkeleton className="h-7 w-24 rounded-full" />
        </div>

        <div className="flex-1 p-6">
          <LoadingSkeleton className="mx-auto h-64 max-w-3xl" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="w-full max-w-md">
          <ErrorState
            title="We couldn't load this project's data right now"
            description="It may not exist, or the service is unavailable. Please try again."
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ProjectHeader
        projectName={project.name}
        externalId={project.externalId}
        sourceUrl={project.sourceUrl}
        latestSync={project.latestSync}
        liveSync={syncStatus.data ?? null}
        isSyncing={startSync.isPending}
        onSync={() => startSync.mutate()}
      />

      {startSync.isError && (
        <div className="px-4 pt-2 sm:px-6" role="status">
          <ErrorState
            title="Sync couldn't be started"
            description="The project data may already be syncing. Please try again in a moment."
            onRetry={() => startSync.reset()}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4 pt-2 sm:px-6">
          <ChatTab activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="min-h-0 flex-1">
          {activeTab === "chat" ? (
            <ProjectChat projectId={projectId} />
          ) : (
            <div className="h-full overflow-y-auto">
              <ProjectSearch projectId={projectId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
