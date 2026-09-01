import type { NormalizedDocument } from "@project-intelligence/types";
import { indexDocument } from "@project-intelligence/ai";

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