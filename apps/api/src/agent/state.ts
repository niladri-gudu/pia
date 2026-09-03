import type { RetrievedChunk } from "../retrieval/types";

export type RetrievalStrategy = "semantic" | "activity" | "hybrid";

export type ActivityDateField = "occurredAt" | "mergedAt";

export type TemporalRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export interface ActivityConstraints {
  dateField?: ActivityDateField;
  temporalRange?: TemporalRange;
  occurredAt?: {
    gte: string;
    lte: string;
  };
  mergedAt?: {
    gte: string;
    lte: string;
  };
  exhaustive?: boolean;
}

export interface RetrievalPlan {
  question: string;
  strategy: RetrievalStrategy;
  activityConstraints?: ActivityConstraints;
  semanticQuery?: string;
}

export interface RetrievedEvidence {
  subQuestion: string;
  chunks: RetrievedChunk[];
}

export interface AgentState {
  projectId: string;
  query: string;
  subQuestions: RetrievalPlan[];
  retrievedChunks: RetrievedChunk[];
  evidence: RetrievedEvidence[];
  evidenceSufficient: boolean;
  missingEvidence: string[];
  retrievalIteration: number;
  context: string;
  answer: string;
}
