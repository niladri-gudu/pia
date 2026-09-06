"use client";

import { ProjectCard } from "@/components/project-card";
import { useProjects } from "@/hooks/use-projects";

export default function Home() {
  const { data: projects, isLoading, isError, error } = useProjects();

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Intelligence Agent</h1>

        <p className="mt-2 text-muted-foreground">
          Agentic research over live engineering and project data.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Select a project to explore its engineering data.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading projects...</p>}

        {isError && (
          <p className="text-sm text-destructive">Failed to load projects: {error.message}</p>
        )}

        {!isLoading && !isError && projects?.length === 0 && (
          <p className="text-sm text-muted-foreground">No projects found.</p>
        )}

        {!isLoading && !isError && projects && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
