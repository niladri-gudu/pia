import { Worker } from "bullmq";
import { redisConnection } from "./queues.js";

let systemWorker: Worker | undefined;

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

export async function stopSystemWorker(): Promise<void> {
  if (systemWorker) {
    await systemWorker.close();
    systemWorker = undefined;
  }
}
