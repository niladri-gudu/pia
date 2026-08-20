"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHealth } from "@/lib/api";

export function HealthCard() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          API Status
          {isPending && <Badge variant="outline">checking…</Badge>}
          {isError && <Badge variant="destructive">unreachable</Badge>}
          {data && <Badge>online</Badge>}
        </CardTitle>
        <CardDescription>Connectivity to the backend health endpoint.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && <p className="text-sm text-muted-foreground">Contacting the API…</p>}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not reach the API: {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.service} — {new Date(data.timestamp).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
