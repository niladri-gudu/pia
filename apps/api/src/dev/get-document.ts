import { prisma } from "@project-intelligence/database";
import { indexDocument } from "@project-intelligence/ai";
import type { NormalizedDocument } from "@project-intelligence/types";

async function main(): Promise<void> {
  const document = await prisma.document.findFirst({
    where: {
      projectId: "cmtgx0qbc0003lrh8t604v78b",
      title: {
        contains: "Remount correctly",
      },
    },
  });

  if (!document) {
    console.log("Document not found");
    return;
  }

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

  console.log(`TITLE:\n${document.title}`);
  console.log(`\nNEW CHUNKS: ${chunks.length}`);

  for (const chunk of chunks) {
    console.log(`\n--- CHUNK ${chunk.chunkIndex} (${chunk.content.length} chars) ---`);
    console.log(chunk.content);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
