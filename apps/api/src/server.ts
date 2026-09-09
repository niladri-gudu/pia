import { prisma } from "@project-intelligence/database";
import { configureTracingFromEnv } from "@project-intelligence/ai";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeRedis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import {
  startGithubSyncWorker,
  startSystemWorker,
  startEmbeddingIndexWorker,
  stopGithubSyncWorker,
  stopSystemWorker,
  stopEmbeddingIndexWorker,
} from "./workers/workers.js";

const app = createApp();

if (configureTracingFromEnv()) {
  logger.info(`LangSmith tracing enabled (project: ${env.LANGSMITH_PROJECT})`);
}

// Sync + indexing workers process the BullMQ queues and are required in
// every environment — without them enqueued jobs would never run.
startGithubSyncWorker();
startEmbeddingIndexWorker();

// The system ping worker only exists to verify the API -> Queue -> Redis ->
// Worker pipeline during development.
if (env.NODE_ENV !== "production") {
  startSystemWorker();
}

const server = app.listen(env.API_PORT, () => {
  logger.info(`API listening on http://localhost:${env.API_PORT}`);
  logger.info(`Health: http://localhost:${env.API_PORT}/health`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close();

  await stopSystemWorker();
  await stopGithubSyncWorker();
  await stopEmbeddingIndexWorker();
  await closeRedis();
  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
