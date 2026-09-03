import { indexDocument } from "@project-intelligence/ai";
import prisma from "@project-intelligence/database";
import type { NormalizedDocument } from "@project-intelligence/types";

import { replaceDocumentChunks } from "../indexing/document-chunk.repository.js";

const PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

async function main(): Promise<void> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: PROJECT_ID,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${documents.length} documents`);

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

    console.log(`[reindex] ${document.title} -> ${chunks.length} chunks`);
  }

  console.log("\nReindex complete");
  console.log(`Documents: ${documents.length}`);
  console.log(`Chunks: ${totalChunks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
