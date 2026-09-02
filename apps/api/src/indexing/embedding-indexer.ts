import type { EmbeddingProvider } from "@project-intelligence/ai";
import prisma from "@project-intelligence/database";
import { saveDocumentChunkEmbedding } from "./embedding.repository.js";

const BATCH_SIZE = 50;

interface UnembeddedChunk {
  id: string;
  content: string;
}

export async function embedDocumentChunks(
  provider: EmbeddingProvider,
  projectId: string,
): Promise<number> {
  let processed = 0;

  while (true) {
    const chunks = await prisma.$queryRaw<UnembeddedChunk[]>`
          SELECT
            dc."id",
            dc."content"
          FROM "DocumentChunk" dc
          INNER JOIN "Document" d
            ON d."id" = dc."documentId"
          WHERE dc."embedding" IS NULL
            AND d."projectId" = ${projectId}
          ORDER BY dc."createdAt" ASC
          LIMIT ${BATCH_SIZE}
        `;

    if (chunks.length === 0) {
      break
    }

    const embeddings = await provider.embedDocuments(
      chunks.map((chunk) => chunk.content),
    );

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: received ${embeddings.length} embeddings for ${chunks.length} chunks`,
      );
    }

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = embeddings[index];

      if (!chunk || !embedding) {
        throw new Error(`Missing chunk or embedding at index ${index}`);
      }

      await saveDocumentChunkEmbedding(chunk.id, embedding);
    }

    processed += chunks.length;

    console.log(
      `[embedding-indexer] Embedded ${chunks.length} chunks. Total: ${processed}`,
    );
  }

  return processed;
}
