import prisma from "@project-intelligence/database";
import { Worker } from "bullmq";
import { redisConnection } from "./queues.js";
import { GithubService, createGithubClient } from "../integrations/index.js";
import { createEmbeddingProvider } from "../indexing/embedding-provider.js";
import { embedDocumentChunks } from "../indexing/embedding-indexer.js";
import { chunkProjectDocuments } from "../indexing/document-indexer.js";
import { enqueueEmbeddingIndexJob } from "./queues.js";
import { logger } from "../lib/logger.js";
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

      // A retry attempt of a previously failed job arrives while the
      // SyncJob is already FAILED, so both PENDING (first attempt) and
      // FAILED (BullMQ retry) are valid entry states.
      if (syncJob.status !== "PENDING" && syncJob.status !== "FAILED") {
        throw new Error(`SyncJob ${syncJobId} is not resumable; current status is ${syncJob.status}`);
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

        await enqueueEmbeddingIndexJob(projectId);

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
    logger.info(`[worker:github-sync] job ${job?.id} completed`);
  });

  githubSyncWorker.on("failed", (job, err) => {
    logger.error(`[worker:github-sync] job ${job?.id} failed: ${err.message}`);
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
      logger.debug(`[worker:system] processing job ${job.id} (${job.name})`);
    },
    { connection: redisConnection() },
  );

  systemWorker.on("completed", (job) => {
    logger.debug(`[worker:system] job ${job.id} completed`);
  });

  systemWorker.on("failed", (job, err) => {
    logger.error(`[worker:system] job ${job?.id} failed: ${err.message}`);
  });

  return systemWorker;
}

export function startEmbeddingIndexWorker(): void {
  if (embeddingIndexWorker) return;

  embeddingIndexWorker = new Worker<EmbeddingIndexJob>(
    "embedding-index",
    async (job) => {
      logger.debug(`[embedding-worker] Starting job ${job.id} for project ${job.data.projectId}`);

      const chunked = await chunkProjectDocuments(job.data.projectId);

      logger.debug(
        `[embedding-worker] Chunked ${chunked} new chunks for project ${job.data.projectId}`,
      );

      const provider = createEmbeddingProvider();

      const processed = await embedDocumentChunks(provider, job.data.projectId);

      logger.info(
        `[embedding-worker] Completed job ${job.id}. Embedded ${processed} chunks.`,
      );

      return {
        processed,
      };
    },
    {
      connection: redisConnection(),
    },
  );

  embeddingIndexWorker.on("failed", (job, error) => {
    logger.error(
      `[embedding-worker] Job ${job?.id ?? "unknown"} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

  logger.debug("[embedding-worker] Started");
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

export async function stopEmbeddingIndexWorker(): Promise<void> {
  if (embeddingIndexWorker) {
    await embeddingIndexWorker.close();
    embeddingIndexWorker = undefined;
  }
}
