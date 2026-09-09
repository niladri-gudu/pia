"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/states";
import { useProjectSearch } from "@/hooks/use-projects";
import { formatRelativeTime } from "@/lib/format";
import type { SearchResult } from "@/lib/api";

interface ProjectSearchProps {
  projectId: string;
}

const SEARCH_SUGGESTIONS = [
  "caching layer",
  "authentication",
  "error boundary",
  "hydration",
];

function SearchHit({ result }: { result: SearchResult }) {
  return (
    <li className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{result.title}</h3>

          {result.activityAt && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular">
              {formatRelativeTime(result.activityAt)}
            </p>
          )}
        </div>

        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground tabular">
          {(result.similarity * 100).toFixed(0)}% match
        </span>
      </div>

      <p className="mt-2 line-clamp-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
        {result.content}
      </p>

      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open source
        </a>
      )}
    </li>
  );
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

  const hasResults = (search.data?.results.length ?? 0) > 0;

  return (
    <section aria-label="Semantic search" className="mx-auto w-full max-w-3xl px-4 py-6">
      <h2 className="text-lg font-semibold tracking-tight">Search project data</h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Semantic search over synced issues, pull requests and commits.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-2" role="search">
        <Input
          aria-label="Search query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commits, pull requests, issues…"
          disabled={search.isFetching}
          className="h-10"
        />

        <Button type="submit" disabled={!query.trim() || search.isFetching} className="h-10">
          <Search className="size-4" />
          <span className="hidden sm:inline">
            {search.isFetching ? "Searching…" : "Search"}
          </span>
        </Button>
      </form>

      {!submittedQuery && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground">Try searching for</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  setSubmittedQuery(suggestion);
                }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {search.isFetching && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <span className="sr-only">Searching…</span>
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
        </div>
      )}

      {!search.isFetching && search.isError && (
        <ErrorState
          title="Search failed"
          description="We couldn't search this project's data right now. Please try again."
          onRetry={() => search.refetch()}
          className="mt-6"
        />
      )}

      {search.data && !search.isFetching && (
        <div className="mt-6">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular">
              {search.data.results.length}
            </span>{" "}
            result{search.data.results.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-foreground">&ldquo;{search.data.query}&rdquo;</span>
          </p>

          {!hasResults && (
            <EmptyState
              icon={<Search />}
              title="No matching results"
              description="Try different keywords, or sync the project to index more of its data."
            />
          )}

          {hasResults && (
            <ul className="mt-4 space-y-3">
              {search.data.results.map((result) => (
                <SearchHit key={result.id} result={result} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
