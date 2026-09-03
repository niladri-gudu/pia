import type { NormalizedDocument } from "@project-intelligence/types";

import { chunkText, type ChunkOptions } from "./chunker.js";

export interface IndexedChunk {
  sourceType: NormalizedDocument["sourceType"];
  sourceId: string;
  documentType: NormalizedDocument["documentType"];

  chunkIndex: number;
  content: string;
}

function buildIndexableContent(document: NormalizedDocument): string {
  const title = document.title.trim();
  const content = document.content.trim();

  if (!content) {
    return title;
  }

  if (content === title || content.startsWith(`${title}\n`)) {
    return content;
  }

  return `${title}\n\n${content}`;
}

export function indexDocument(
  document: NormalizedDocument,
  options?: ChunkOptions,
): IndexedChunk[] {
  const chunks = chunkText(buildIndexableContent(document), options);

  return chunks.map((chunk) => ({
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    documentType: document.documentType,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
  }));
}
