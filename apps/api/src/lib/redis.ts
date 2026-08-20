import { Redis } from "ioredis";
import { env } from "../config/env.js";

let client: Redis | undefined;

/**
 * Shared ioredis client (lazy). Connects on first use so the API still boots
 * when Redis is temporarily unavailable.
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
  }
  return client;
}

export async function pingRedis(): Promise<string> {
  return getRedis().ping();
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
