export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  url?: string;
  similarity: number;
}

export interface RetrievalOptions {
  projectId: string;
  topK?: number;
}

export interface Retriever {
  retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievedChunk[]>;
}
