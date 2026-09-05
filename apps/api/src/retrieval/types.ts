import type { RetrievedChunk } from "@project-intelligence/ai";

export type { RetrievedChunk };
  
export interface RetrievalOptions {
  projectId: string;
  topK?: number;
}

export interface Retriever {
  retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<import("@project-intelligence/ai").RetrievedChunk[]>;
}
