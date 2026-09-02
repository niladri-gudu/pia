import prisma from "@project-intelligence/database";

function vectorLiteral(values: number[]): string {
  if (values.length === 0) {
    throw new Error("Embedding vector cannot be empty");
  }

  return `[${values.join(",")}]`;
}

export async function saveDocumentChunkEmbedding(
  chunkId: string,
  embedding: number[],
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "DocumentChunk"
    SET "embedding" = ${vectorLiteral(embedding)}::vector
    WHERE "id" = ${chunkId}
  `;
}
