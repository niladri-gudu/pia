import type { EmbeddingProvider } from "@project-intelligence/ai";
import { searchSimilarChunks } from "./retrieval.repository";
import type { RetrievedChunk, Retriever, RetrievalOptions } from "./types";

const DEFAULT_TOP_K = 5;
const RETRIEVAL_CANDIDATE_MULTIPLIER = 3;

function deduplicateByDocument(chunks: RetrievedChunk[], topK: number): RetrievedChunk[] {
  const seenDocuments = new Set<string>();
  const results: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    if (seenDocuments.has(chunk.documentId)) {
      continue;
    }

    seenDocuments.add(chunk.documentId);
    results.push(chunk);

    if (results.length === topK) {
      break;
    }
  }

  return results;
}

export class VectorRetriever implements Retriever {
  constructor(private readonly embeddingProvider: EmbeddingProvider) {}

  async retrieve(query: string, options: RetrievalOptions): Promise<RetrievedChunk[]> {
    const topK = options.topK ?? DEFAULT_TOP_K;

    if (!query.trim()) {
      throw new Error("Query cannot be empty");
    }

    const queryEmbedding = await this.embeddingProvider.embedQuery(query);

    const candidates = await searchSimilarChunks(
      options.projectId,
      queryEmbedding,
      topK * RETRIEVAL_CANDIDATE_MULTIPLIER,
    );

    return deduplicateByDocument(candidates, topK);
  }
}
