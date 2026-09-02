import type { EmbeddingProvider } from "@project-intelligence/ai";
import { searchSimilarChunks } from "./retrieval.repository.js";
import type {
  RetrievedChunk,
  Retriever,
  RetrievalOptions,
} from "./types.js";

export class VectorRetriever implements Retriever {
  constructor(private readonly embeddingProvider: EmbeddingProvider) {}

  async retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievedChunk[]> {
    const topK = options.topK ?? 5;

    if (!query.trim()) {
      throw new Error("Query cannot be empty");
    }

    const queryEmbedding =
      await this.embeddingProvider.embedQuery(query);

    return searchSimilarChunks(
      options.projectId,
      queryEmbedding,
      topK,
    );
  }
}
