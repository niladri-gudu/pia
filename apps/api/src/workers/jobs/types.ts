/**
 * Background job type names. Expand as real sync jobs (GitHub, Jira, indexing,
 * etc.) are introduced in later phases.
 */
export type JobName = "system.ping";

export interface SystemPingJob {
  ts: number;
}

export type JobData = SystemPingJob;
