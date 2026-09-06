import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/lib/api";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{project.name}</CardTitle>

            <Badge variant="secondary">{project.sourceType}</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{project.externalId}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
