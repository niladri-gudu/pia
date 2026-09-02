import prisma from "@project-intelligence/database";
import { Worker } from "bullmq";
import { redisConnection } from "./queues.js";
import { GithubService, createGithubClient } from "../integrations/index.js";
import { createEmbeddingProvider } from "../indexing/embedding-provider.js";
import { embedDocumentChunks } from "../indexing/embedding-indexer.js";
import type { EmbeddingIndexJob } from "./jobs/types.js";

let systemWorker: Worker | undefined;
let githubSyncWorker: Worker | undefined;
let embeddingIndexWorker: Worker<EmbeddingIndexJob> | undefined;

export function startGithubSyncWorker(): Worker {
  if (githubSyncWorker) return githubSyncWorker;

  githubSyncWorker = new Worker(
    "github-sync",
    async (job) => {
      if (job.name !== "github.sync") {
        throw new Error(`Unsupported GitHub sync job: ${job.name}`);
      }

      const { projectId, syncJobId } = job.data;

      const syncJob = await prisma.syncJob.findUnique({
        where: {
          id: syncJobId,
        },
      });

      if (!syncJob) {
        throw new Error(`SyncJob ${syncJobId} not found`);
      }

      if (syncJob.projectId !== projectId) {
        throw new Error(`SyncJob ${syncJobId} does not belong to project ${projectId}`);
      }

      if (syncJob.provider !== "GITHUB") {
        throw new Error(`SyncJob ${syncJobId} is not a GitHub sync job`);
      }

      if (syncJob.status !== "PENDING") {
        throw new Error(`SyncJob ${syncJobId} is not pending; current status is ${syncJob.status}`);
      }

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      try {
        const project = await prisma.project.findUnique({
          where: {
            id: projectId,
          },
        });

        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }

        if (project.sourceType !== "GITHUB") {
          throw new Error(`Project ${projectId} is not a GitHub project`);
        }

        const [owner, repository] = project.externalId.split("/");

        if (!owner || !repository) {
          throw new Error(`Invalid GitHub project externalId for project ${projectId}`);
        }

        const githubClient = createGithubClient();
        const githubService = new GithubService(githubClient);

        const result = await githubService.syncRepository({
          owner,
          repository,
          workspaceId: project.workspaceId,
          projectId: project.id,
        });

        await prisma.syncJob.update({
          where: {
            id: syncJob.id,
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            recordsProcessed: result.documents.length,
          },
        });

        return {
          recordsProcessed: result.documents.length,
          created: result.created,
          updated: result.updated,
        };
      } catch (error) {
        await prisma.syncJob.update({
          where: {
            id: syncJob.id,
          },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        throw error;
      }
    },
    {
      connection: redisConnection(),
    },
  );

  githubSyncWorker.on("completed", (job) => {
    console.error(`[worker:github-sync] job ${job?.id} completed`);
  });

  githubSyncWorker.on("failed", (job, err) => {
    console.error(`[worker:github-sync] job ${job?.id} failed`, err);
  });

  return githubSyncWorker;
}

/**
 * Development-only system worker that logs jobs. Demonstrates the
 * API -> Queue -> Redis -> Worker path. Replace with real workers later.
 */
export function startSystemWorker(): Worker {
  if (systemWorker) return systemWorker;

  systemWorker = new Worker(
    "system",
    async (job) => {
      console.log(`[worker:system] processing job ${job.id} (${job.name})`, job.data);
    },
    { connection: redisConnection() },
  );

  systemWorker.on("completed", (job) => {
    console.log(`[worker:system] job ${job.id} completed`);
  });

  systemWorker.on("failed", (job, err) => {
    console.error(`[worker:system] job ${job?.id} failed`, err);
  });

  return systemWorker;
}

export function startEmbeddingIndexWorker(): void {
  if (embeddingIndexWorker) return;

  embeddingIndexWorker = new Worker<EmbeddingIndexJob>(
    "embedding-index",
    async (job) => {
      console.log(`[embedding-worker] Starting job ${job.id} for project ${job.data.projectId}`,)

      const provider = createEmbeddingProvider();

      const processed = await embedDocumentChunks(
        provider,
        job.data.projectId
      )

      console.log(`[embedding-worker] Completed job ${job.id}. Embedded ${processed} chunks.`,)

      return {
        processed
      }
    },
    {
      connection: redisConnection(),
    }
  )

  embeddingIndexWorker.on("failed", (job, error) => {
    console.error(
      `[embedding-worker] Job ${job?.id ?? "unknown"} failed:`,
      error,
    );
  });

  console.log("[embedding-worker] Started");
}

export async function stopSystemWorker(): Promise<void> {
  if (systemWorker) {
    await systemWorker.close();
    systemWorker = undefined;
  }
}

export async function stopGithubSyncWorker(): Promise<void> {
  if (githubSyncWorker) {
    await githubSyncWorker.close();
    githubSyncWorker = undefined;
  }
}
