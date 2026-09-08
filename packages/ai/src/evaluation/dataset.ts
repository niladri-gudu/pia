import type { EvaluationCase } from "./types";

const EVALUATION_PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

/**
 * Initial evaluation dataset for the Project Intelligence Agent.
 *
 * The questions are intentionally grounded in information that exists
 * in the currently indexed project so that the evaluation measures
 * agent behaviour rather than missing-data failures.
 */
export const evaluationDataset: EvaluationCase[] = [
  {
    name: "repository technical question",
    projectId: EVALUATION_PROJECT_ID,
    question:
      "What is React's Flight serialization system responsible for?",
    expectedAnswer:
      "The answer should explain React Flight serialization using retrieved repository evidence and cite the relevant sources.",
  },
  {
    name: "repository implementation question",
    projectId: EVALUATION_PROJECT_ID,
    question:
      "What changes were made to React's compiler or compiler-related code?",
    expectedAnswer:
      "The answer should summarize relevant compiler changes using retrieved repository evidence and citations.",
  },
  {
    name: "recent activity",
    projectId: EVALUATION_PROJECT_ID,
    question: "What recent work has been done on this project?",
    expectedAnswer:
      "The answer should summarize relevant recent project activity using temporal retrieval and cite the retrieved evidence.",
  },
  {
    name: "unsupported question",
    projectId: EVALUATION_PROJECT_ID,
    question: "What is the CEO's favorite programming language?",
    expectedAnswer:
      "The answer should clearly state that the information is not available in the project context and must not invent an answer.",
  },
  {
    name: "project memory",
    projectId: EVALUATION_PROJECT_ID,
    question: "What caching technology did we decide to use?",
    expectedAnswer:
      "The answer should use persistent project memory to identify Redis as the caching decision and should not fabricate repository evidence.",
  },
  {
    name: "memory plus evidence",
    projectId: EVALUATION_PROJECT_ID,
    question:
      "What caching technology did we decide to use, and is it implemented in the project?",
    expectedAnswer:
      "The answer should use project memory for the Redis decision and separately use repository evidence to determine whether Redis implementation is verified.",
  },
];