import type { RetrievedChunk } from "../retrieval/types";

export interface AgentState {
  projectId: string;
  query: string;
  retrievedChunks: RetrievedChunk[];
  context: string;
  answer: string;
}