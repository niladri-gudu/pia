import type { NormalizedDocument } from "@project-intelligence/types";
import { indexDocument } from "@project-intelligence/ai";
import prisma from "@project-intelligence/database";

import { replaceDocumentChunks } from "./document-chunk.repository";

export async function indexDocumentChunks(
  documentId: string,
  document: NormalizedDocument,
): Promise<number> {
  const chunks = indexDocument(document);

  await replaceDocumentChunks({
    documentId,
    chunks,
  });

  return chunks.length;
}

export async function chunkProjectDocuments(projectId: string): Promise<number> {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      chunks: { none: {} },
    },
    orderBy: { createdAt: "asc" },
  });

  let totalChunks = 0;

  for (const document of documents) {
    const normalizedDocument: NormalizedDocument = {
      sourceType: document.sourceType,
      sourceId: document.sourceId,
      documentType: document.documentType,
      title: document.title,
      content: document.content,
      url: document.url ?? undefined,
      author: document.author ?? undefined,
      occurredAt: document.occurredAt ?? undefined,
      metadata: document.metadata as Record<string, unknown>,
    };

    const chunks = indexDocument(normalizedDocument);

    await replaceDocumentChunks({
      documentId: document.id,
      chunks,
    });

    totalChunks += chunks.length;
  }

  return totalChunks;
}