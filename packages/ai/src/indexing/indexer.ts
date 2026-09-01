import type { NormalizedDocument } from "@project-intelligence/types";

import { chunkText, type ChunkOptions } from "./chunker.js";

export interface IndexedChunk {
  sourceType: NormalizedDocument["sourceType"];
  sourceId: string;
  documentType: NormalizedDocument["documentType"];

  chunkIndex: number;
  content: string;
}

export function indexDocument(
  document: NormalizedDocument,
  options?: ChunkOptions,
): IndexedChunk[] {
  const chunks = chunkText(
    `${document.title}\n\n${document.content}`,
    options,
  );

  return chunks.map((chunk) => ({
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    documentType: document.documentType,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
  }));
}
