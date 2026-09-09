import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import type { Project } from "@/lib/api";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex min-h-32 flex-col justify-between rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Open project ${project.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{project.name}</h3>

          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {project.externalId}
          </p>
        </div>

        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {project.sourceType}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular">Updated {formatRelativeTime(project.updatedAt)}</span>

        <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Open
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
