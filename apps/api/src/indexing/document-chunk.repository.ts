import prisma from "@project-intelligence/database";

export interface SaveDocumentChunksInput {
  documentId: string;
  chunks: Array<{
    content: string;
    chunkIndex: number;
  }>;
}

export async function replaceDocumentChunks({
  documentId,
  chunks,
}: SaveDocumentChunksInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({
      where: {
        documentId,
      },
    });

    if (chunks.length === 0) {
      return;
    }

    await tx.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
      })),
    });
  });
}
