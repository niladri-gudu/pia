import { prisma } from "@project-intelligence/database";

/**
 * Create a memory for a project.
 */
export async function createMemory(input: {
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
}) {
  return prisma.memory.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      content: input.content,
    },
    select: {
      id: true,
      projectId: true,
      type: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find all memories belonging to a project.
 */
export async function findProjectMemories(projectId: string) {
  return prisma.memory.findMany({
    where: {
      projectId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      projectId: true,
      type: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Save a vector embedding for a memory.
 *
 * Prisma does not natively support pgvector values, so this uses
 * parameterized raw SQL to update the unsupported vector column.
 */
export async function saveMemoryEmbedding(memoryId: string, embedding: number[]) {
  if (embedding.length !== 768) {
    throw new Error(`Memory embedding must have 768 dimensions, received ${embedding.length}`);
  }

  const vectorLiteral = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "Memory"
    SET "embedding" = ${vectorLiteral}::vector
    WHERE "id" = ${memoryId}
  `;
}

interface MemorySearchRow {
  id: string;
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
  similarity: number;
}

function vectorLiteral(values: number[]): string {
  if (values.length === 0) {
    throw new Error("Query embedding cannot be empty");
  }

  return `[${values.join(",")}]`;
}

/**
 * Find project memories semantically similar to a query embedding.
 */
export async function searchSimilarMemories(
  projectId: string,
  queryEmbedding: number[],
  topK: number,
  similarityThreshold = 0.7,
): Promise<MemorySearchRow[]> {
  if (topK <= 0) {
    throw new Error("topK must be greater than zero");
  }

  const vector = vectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRaw<MemorySearchRow[]>`
    SELECT
      m."id",
      m."projectId",
      m."type",
      m."content",
      1 - (m."embedding" <=> ${vector}::vector) AS "similarity"
    FROM "Memory" m
    WHERE m."embedding" IS NOT NULL
      AND m."projectId" = ${projectId}
      AND 1 - (m."embedding" <=> ${vector}::vector) >= ${similarityThreshold}
    ORDER BY m."embedding" <=> ${vector}::vector
    LIMIT ${topK}
  `;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    content: row.content,
    similarity: Number(row.similarity),
  }));
}
