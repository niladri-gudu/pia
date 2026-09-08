import type { EvaluationCase } from "./types";

const EVALUATION_PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

/**
 * Initial evaluation cases for the Project Intelligence Agent.
 *
 * These cases intentionally cover different agent behaviours:
 * repository retrieval, activity retrieval, unsupported questions,
 * project memory, and combined memory + evidence questions.
 */
export const evaluationDataset: EvaluationCase[] = [
  {
    name: "repository fact",
    projectId: EVALUATION_PROJECT_ID,
    question: "What technologies are used in this project?",
    expectedAnswer:
      "The answer should identify technologies that are supported by the retrieved project evidence.",
  },
  {
    name: "technical explanation",
    projectId: EVALUATION_PROJECT_ID,
    question: "How does the project's data ingestion pipeline work?",
    expectedAnswer:
      "The answer should explain the ingestion flow using retrieved project evidence and cite relevant sources.",
  },
  {
    name: "activity question",
    projectId: EVALUATION_PROJECT_ID,
    question: "What work has been done recently on this project?",
    expectedAnswer:
      "The answer should summarize relevant recent project activity using the appropriate temporal retrieval.",
  },
  {
    name: "unsupported question",
    projectId: EVALUATION_PROJECT_ID,
    question: "What is the CEO's favorite programming language?",
    expectedAnswer:
      "The answer should not invent information that is not available in the project context.",
  },
  {
    name: "project memory",
    projectId: EVALUATION_PROJECT_ID,
    question: "What caching technology did we decide to use?",
    expectedAnswer:
      "The answer should use relevant persistent project memory when the decision is stored there.",
  },
  {
    name: "memory and evidence",
    projectId: EVALUATION_PROJECT_ID,
    question: "What caching technology did we decide to use, and is it implemented in the project?",
    expectedAnswer:
      "The answer should use project memory for the decision and project evidence to determine whether the decision is implemented.",
  },
];
