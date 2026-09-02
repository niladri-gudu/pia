/**
 * Background job type names. Expand as real sync jobs (GitHub, Jira, indexing,
 * etc.) are introduced in later phases.
 */
export type JobName = "system.ping" | "github.sync" | "embedding.index";

export interface SystemPingJob {
  ts: number;
}

export interface GithubSyncJob {
  projectId: string;
  syncJobId: string;
}

export interface EmbeddingIndexJob {
  projectId: string;
}

export type JobData = SystemPingJob | GithubSyncJob | EmbeddingIndexJob;
