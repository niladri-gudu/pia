/**
 * Background job type names. Expand as real sync jobs (GitHub, Jira, indexing,
 * etc.) are introduced in later phases.
 */
export type JobName = "system.ping" | "github.sync";

export interface SystemPingJob {
  ts: number;
}

export interface GithubSyncJob {
  projectId: string;
  syncJobId: string;
}

export type JobData = SystemPingJob | GithubSyncJob;
