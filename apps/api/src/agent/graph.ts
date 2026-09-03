import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { buildContextNode } from "./nodes/context";
import { generateNode } from "./nodes/generate";
import { decomposeNode } from "./nodes/decompose";
import { evaluateNode } from "./nodes/evaluate";
import { refineNode } from "./nodes/refine";
import type { AgentState } from "./state";

const MAX_RETRIEVAL_ITERATIONS = 2;

const AgentStateAnnotation = Annotation.Root({
  projectId: Annotation<string>,
  query: Annotation<string>,

  subQuestions: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  retrievedChunks: Annotation<AgentState["retrievedChunks"]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  evidence: Annotation<AgentState["evidence"]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  evidenceSufficient: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  missingEvidence: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  retrievalIteration: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  context: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  answer: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

function routeAfterEvaluation(state: AgentState): "refine" | "buildContext" {
  if (!state.evidenceSufficient && state.retrievalIteration < MAX_RETRIEVAL_ITERATIONS) {
    return "refine";
  }

  return "buildContext";
}

const graph = new StateGraph(AgentStateAnnotation)
  .addNode("decompose", decomposeNode)
  .addNode("retrieve", retrieveNode)
  .addNode("evaluate", evaluateNode)
  .addNode("refine", refineNode)
  .addNode("buildContext", buildContextNode)
  .addNode("generate", generateNode)

  .addEdge(START, "decompose")
  .addEdge("decompose", "retrieve")
  .addEdge("retrieve", "evaluate")

  .addConditionalEdges("evaluate", routeAfterEvaluation, {
    refine: "refine",
    buildContext: "buildContext",
  })

  .addEdge("refine", "retrieve")
  .addEdge("buildContext", "generate")
  .addEdge("generate", END);

export const agentGraph = graph.compile();
