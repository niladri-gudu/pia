import { Queue } from "bullmq";
import { env } from "../config/env.js";
import type { GithubSyncJob, EmbeddingIndexJob } from "./jobs/types.js";

let systemQueue: Queue | undefined;
let githubSyncQueue: Queue<GithubSyncJob> | undefined;
let embeddingIndexQueue: Queue<EmbeddingIndexJob> | undefined;

export function redisConnection() {
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db:
      url.pathname && url.pathname !== "/"
        ? Number(url.pathname.slice(1))
        : 0,
    // BullMQ requires this to be null so blocking commands retry forever.
    maxRetriesPerRequest: null,
  };
}

export function getGithubSyncQueue(): Queue<GithubSyncJob> {
  if (!githubSyncQueue) {
    githubSyncQueue = new Queue<GithubSyncJob>("github-sync", {
      connection: redisConnection(),
    });
  }

  return githubSyncQueue;
}

export function getEmbeddingIndexQueue(): Queue<EmbeddingIndexJob> {
  if (!embeddingIndexQueue) {
    embeddingIndexQueue = new Queue<EmbeddingIndexJob>("embedding-index", {
      connection: redisConnection(),
    });
  }

  return embeddingIndexQueue;
}

export async function enqueueGithubSyncJob(
  projectId: string,
  syncJobId: string,
): Promise<string> {
  const job = await getGithubSyncQueue().add("github.sync", {
    projectId,
    syncJobId,
  });

  return job.id ?? "";
}

export async function enqueueEmbeddingIndexJob(
  projectId: string,
): Promise<string> {
  const job = await getEmbeddingIndexQueue().add(
    "embedding.index",
    { projectId },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 30_000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  return job.id ?? "";
}

/**
 * Example/system queue used to verify the API -> Queue -> Redis -> Worker path.
 * Replace with real queues (e.g. github-sync, jira-sync, indexing) later.
 */
export function getSystemQueue(): Queue {
  if (!systemQueue) {
    systemQueue = new Queue("system", {
      connection: redisConnection(),
    });
  }

  return systemQueue;
}

export async function enqueueSystemPing(): Promise<string> {
  const job = await getSystemQueue().add("system.ping", {
    ts: Date.now(),
  });

  return job.id ?? "";
}
