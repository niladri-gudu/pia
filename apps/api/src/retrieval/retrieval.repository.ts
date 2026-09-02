import prisma from "@project-intelligence/database";
import type { RetrievedChunk } from "./types";

interface RetrievedChunkRow {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  url: string | null;
  similarity: number;
}

function vectorLiteral(values: number[]): string {
  if (values.length === 0) {
    throw new Error("Query embedding cannot be empty");
  }

  return `[${values.join(",")}]`;
}

export async function searchSimilarChunks(
  projectId: string,
  queryEmbedding: number[],
  topK: number,
): Promise<RetrievedChunk[]> {
  if (topK <= 0) {
    throw new Error("topK must be greater than zero");
  }

  const vector = vectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRaw<RetrievedChunkRow[]>`
    SELECT
      dc."id",
      dc."documentId",
      dc."content",
      dc."chunkIndex",
      d."title",
      d."url",
      1 - (dc."embedding" <=> ${vector}::vector) AS "similarity"
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d
      ON d."id" = dc."documentId"
    WHERE dc."embedding" IS NOT NULL
      AND d."projectId" = ${projectId}
    ORDER BY dc."embedding" <=> ${vector}::vector
    LIMIT ${topK}
  `;

  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    content: row.content,
    chunkIndex: row.chunkIndex,
    title: row.title,
    ...(row.url ? { url: row.url } : {}),
    similarity: Number(row.similarity),
  }));
}
