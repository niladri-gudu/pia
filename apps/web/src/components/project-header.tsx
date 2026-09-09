"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SyncStatusPill, type SyncStatusValue } from "@/components/states";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatRelativeTime } from "@/lib/format";
import type { SyncJob } from "@/lib/api";

interface ProjectHeaderProps {
  projectName: string;
  externalId: string;
  sourceUrl?: string | null;
  latestSync: SyncJob | null;
  liveSync: SyncJob | null;
  isSyncing: boolean;
  onSync: () => void;
}

/**
 * Slim app header for the project intelligence page: identity, live sync
 * state, the primary sync action and the theme toggle.
 */
export function ProjectHeader({
  projectName,
  externalId,
  sourceUrl,
  latestSync,
  liveSync,
  isSyncing,
  onSync,
}: ProjectHeaderProps) {
  const sync = liveSync ?? latestSync;
  const status = sync?.status as SyncStatusValue | undefined;
  const isSyncInFlight = status === "PENDING" || status === "RUNNING";

  return (
    <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5 sm:px-6">
      <Button variant="ghost" size="icon" asChild aria-label="Back to projects">
        <Link href="/">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <Link href="/" className="flex items-center gap-2" aria-label="Project Intelligence Agent home">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </span>

        <span className="hidden text-sm font-semibold tracking-tight sm:inline">PIA</span>
      </Link>

      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold tracking-tight">{projectName}</h1>

          <span className="hidden font-mono text-xs text-muted-foreground md:inline">
            {externalId}
          </span>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open the ${projectName} repository`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>

        <p className="hidden text-xs text-muted-foreground sm:block">
          {sync?.completedAt
            ? `Last sync ${formatRelativeTime(sync.completedAt)}${
                sync.recordsProcessed ? ` · ${sync.recordsProcessed} records` : ""
              }`
            : "Never synced"}
        </p>
      </div>

      {status && <SyncStatusPill status={status} />}

      <Button onClick={onSync} disabled={isSyncing || isSyncInFlight} size="sm">
        <RefreshCw className={isSyncing || isSyncInFlight ? "size-4 animate-spin" : "size-4"} />
        <span className="hidden sm:inline">
          {isSyncing || isSyncInFlight ? "Syncing…" : "Sync now"}
        </span>
      </Button>

      <ThemeToggle />
    </header>
  );
}
