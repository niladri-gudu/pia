import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared async-state primitives. Every async surface uses these so loading,
 * empty and error presentation stays consistent across the app.
 */

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-medium text-destructive">{title}</p>

      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
      {icon && <div className="text-muted-foreground [&_svg]:size-6">{icon}</div>}

      <p className="text-sm font-medium">{title}</p>

      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}

      {children}
    </div>
  );
}

export type SyncStatusValue = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

const SYNC_STATUS_LABELS: Record<SyncStatusValue, string> = {
  PENDING: "Queued",
  RUNNING: "Syncing",
  COMPLETED: "Indexed",
  FAILED: "Failed",
};

const SYNC_STATUS_DOT_CLASSES: Record<SyncStatusValue, string> = {
  PENDING: "bg-warning",
  RUNNING: "bg-info animate-pulse",
  COMPLETED: "bg-success",
  FAILED: "bg-destructive",
};

const SYNC_STATUS_TEXT_CLASSES: Record<SyncStatusValue, string> = {
  PENDING: "text-warning",
  RUNNING: "text-info",
  COMPLETED: "text-success",
  FAILED: "text-destructive",
};

/**
 * Compact status pill with a colored dot. Announces its state to screen
 * readers via text rather than color alone.
 */
export function SyncStatusPill({
  status,
  className,
}: {
  status: SyncStatusValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5",
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", SYNC_STATUS_DOT_CLASSES[status])} aria-hidden />

      <span className={cn("text-xs font-medium", SYNC_STATUS_TEXT_CLASSES[status])}>
        {SYNC_STATUS_LABELS[status]}
      </span>
    </span>
  );
}
