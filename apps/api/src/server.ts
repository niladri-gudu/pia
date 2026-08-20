import { prisma } from "@project-intelligence/database";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeRedis } from "./lib/redis.js";
import { startSystemWorker, stopSystemWorker } from "./workers/workers.js";

const app = createApp();

// Start the dev/system worker in non-production environments to verify the
// API -> Queue -> Redis -> Worker pipeline.
if (env.NODE_ENV !== "production") {
  startSystemWorker();
}

const server = app.listen(env.API_PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.API_PORT}`);
  console.log(`   Health: http://localhost:${env.API_PORT}/health`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close();
  await stopSystemWorker();
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
