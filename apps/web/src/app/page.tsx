"use client";

import { Sparkles } from "lucide-react";

import { ProjectCard } from "@/components/project-card";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/states";
import { ThemeToggle } from "@/components/theme-toggle";
import { useProjects } from "@/hooks/use-projects";

export default function Home() {
  const { data: projects, isLoading, isError, refetch } = useProjects();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>

          <div>
            <p className="text-sm font-semibold tracking-tight">Project Intelligence Agent</p>

            <p className="text-xs text-muted-foreground">
              Agentic research over live engineering data
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>

        <p className="mt-1 text-muted-foreground">
          Select a project to ask questions about its code, issues and activity.
        </p>

        {isLoading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-32" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="We couldn't load your projects right now"
            description="Please try again."
            onRetry={() => void refetch()}
            className="mt-8"
          />
        )}

        {!isLoading && !isError && projects?.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Sync a GitHub repository to create your first project."
            className="mt-8 rounded-xl border border-dashed"
          />
        )}

        {!isLoading && !isError && projects && projects.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
