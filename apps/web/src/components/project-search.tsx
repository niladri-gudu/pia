"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjectSearch } from "@/hooks/use-projects";

interface ProjectSearchProps {
  projectId: string;
}

export function ProjectSearch({ projectId }: ProjectSearchProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const search = useProjectSearch(projectId, submittedQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    setSubmittedQuery(trimmedQuery);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search project data</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commits, pull requests, issues, or code..."
            disabled={search.isFetching}
          />

          <Button type="submit" disabled={!query.trim() || search.isFetching}>
            {search.isFetching ? "Searching..." : "Search"}
          </Button>
        </form>

        {search.isError && (
          <p className="text-sm text-destructive">Search failed: {search.error.message}</p>
        )}

        {search.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {search.data.results.length} results for{" "}
                <span className="font-medium text-foreground">&quot;{search.data.query}&quot;</span>
              </p>
            </div>

            {search.data.results.length === 0 && (
              <p className="text-sm text-muted-foreground">No matching results found.</p>
            )}

            <div className="space-y-3">
              {search.data.results.map((result) => (
                <div key={result.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium">{result.title}</h3>

                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                        {result.content}
                      </p>
                    </div>

                    <Badge variant="secondary">{(result.similarity * 100).toFixed(1)}%</Badge>
                  </div>

                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm text-primary hover:underline"
                    >
                      View source →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
