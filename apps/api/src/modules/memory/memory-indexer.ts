import type { EmbeddingProvider } from "@project-intelligence/ai";
import prisma from "@project-intelligence/database";
import { saveMemoryEmbedding } from "./memory.repository";

const BATCH_SIZE = 50;

interface UnembeddedMemory {
  id: string;
  content: string;
}

/**
 * Generate embeddings for project memories that do not have one yet.
 */
export async function embedProjectMemories(
  provider: EmbeddingProvider,
  projectId: string,
): Promise<number> {
  let processed = 0;

  while (true) {
    const memories = await prisma.$queryRaw<UnembeddedMemory[]>`
      SELECT
        m."id",
        m."content"
      FROM "Memory" m
      WHERE m."embedding" IS NULL
        AND m."projectId" = ${projectId}
      ORDER BY m."createdAt" ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (memories.length === 0) {
      break;
    }

    const embeddings = await provider.embedDocuments(memories.map((memory) => memory.content));

    if (embeddings.length !== memories.length) {
      throw new Error(
        `Embedding count mismatch: received ${embeddings.length} embeddings for ${memories.length} memories`,
      );
    }

    for (let index = 0; index < memories.length; index += 1) {
      const memory = memories[index];
      const embedding = embeddings[index];

      if (!memory || !embedding) {
        throw new Error(`Missing memory or embedding at index ${index}`);
      }

      await saveMemoryEmbedding(memory.id, embedding);
    }

    processed += memories.length;

    console.log(`[memory-indexer] Embedded ${memories.length} memories. Total: ${processed}`);
  }

  return processed;
}
