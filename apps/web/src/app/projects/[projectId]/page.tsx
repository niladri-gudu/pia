"use client";

import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject, useProjectSyncStatus, useStartProjectSync } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { ProjectChat } from "@/components/project-chat";
import { ProjectSearch } from "@/components/project-search";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const syncStatus = useProjectSyncStatus(projectId);
  const startSync = useStartProjectSync(projectId);

  const { data: project, isLoading, isError, error } = useProject(projectId);

  if (isLoading) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="p-8">
        <p className="text-sm text-destructive">Failed to load project: {error.message}</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </main>
    );
  }

  const sync = project.latestSync;

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>

          <Badge variant="secondary">{project.sourceType}</Badge>
        </div>

        <p className="mt-2 text-muted-foreground">{project.externalId}</p>

        {project.sourceUrl && (
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            View repository →
          </a>
        )}

        <div className="mt-4">
          <Button
            onClick={() => startSync.mutate()}
            disabled={
              startSync.isPending ||
              syncStatus.data?.status === "RUNNING" ||
              syncStatus.data?.status === "PENDING"
            }
          >
            {startSync.isPending ||
            syncStatus.data?.status === "RUNNING" ||
            syncStatus.data?.status === "PENDING"
              ? "Syncing..."
              : "Sync Now"}
          </Button>

          {startSync.isError && (
            <p className="mt-2 text-sm text-destructive">
              Failed to start sync: {startSync.error.message}
            </p>
          )}
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
          </CardHeader>

          <CardContent>
            {syncStatus.data ? (
              <Badge>{syncStatus.data.status}</Badge>
            ) : sync ? (
              <Badge>{sync.status}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Never synced</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold">
              {syncStatus.data?.recordsProcessed ?? sync?.recordsProcessed ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              {sync?.completedAt ? new Date(sync.completedAt).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>
      </section>
      <div className="space-y-6">
        <ProjectChat projectId={projectId} />
        <ProjectSearch projectId={projectId} />
      </div>{" "}
    </main>
  );
}
