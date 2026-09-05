import { prisma } from "@project-intelligence/database";
import { configureTracingFromEnv } from "@project-intelligence/ai";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeRedis } from "./lib/redis.js";
import {
  startGithubSyncWorker,
  startSystemWorker,
  startEmbeddingIndexWorker,
  stopGithubSyncWorker,
  stopSystemWorker,
} from "./workers/workers.js";

const app = createApp();

if (configureTracingFromEnv()) {
  console.log(
    `🔍 LangSmith tracing enabled (project: ${env.LANGSMITH_PROJECT})`,
  );
}

// Start the dev/system worker in non-production environments to verify the
// API -> Queue -> Redis -> Worker pipeline.
if (env.NODE_ENV !== "production") {
  startSystemWorker();
  startGithubSyncWorker();
  startEmbeddingIndexWorker();
}

const server = app.listen(env.API_PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.API_PORT}`);
  console.log(`   Health: http://localhost:${env.API_PORT}/health`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close();

  await stopSystemWorker();
  await stopGithubSyncWorker();
  await closeRedis();
  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
