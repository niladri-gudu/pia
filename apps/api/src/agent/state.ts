import type { RetrievedChunk } from "../retrieval/types";

export interface RetrievedEvidence {
  subQuestion: string;
  chunks: RetrievedChunk[];
}

export interface AgentState {
  projectId: string;
  query: string;
  subQuestions: string[];
  retrievedChunks: RetrievedChunk[];
  evidence: RetrievedEvidence[];
  evidenceSufficient: boolean;
  missingEvidence: string[];
  retrievalIteration: number;
  context: string;
  answer: string;
}
