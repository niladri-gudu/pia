import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { decomposeNode } from "../agent/nodes/decompose";
import { retrieveNode } from "../agent/nodes/retrieve";
import { refineNode } from "../agent/nodes/refine";
import { buildContextNode } from "../agent/nodes/context";
import { generateNode } from "../agent/nodes/generate";
import type { AgentState } from "../agent/state";

const MAX_RETRIEVAL_ITERATIONS = 2;

const AgentStateAnnotation = Annotation.Root({
  projectId: Annotation<string>,
  query: Annotation<string>,

  subQuestions: Annotation<AgentState["subQuestions"]>({
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

async function forcedEvaluationNode(_state: AgentState): Promise<Partial<AgentState>> {
  console.log("[test] Forcing evidenceSufficient=false");

  return {
    evidenceSufficient: false,
    missingEvidence: [
      "Pull requests merged during this quarter.",
      "Specific risks, regressions, or security issues introduced by those changes.",
    ],
  };
}

function routeAfterEvaluation(state: AgentState): "refine" | "buildContext" {
  if (!state.evidenceSufficient && state.retrievalIteration < MAX_RETRIEVAL_ITERATIONS) {
    return "refine";
  }

  return "buildContext";
}

const graph = new StateGraph(AgentStateAnnotation)
  .addNode("decompose", decomposeNode)
  .addNode("retrieve", retrieveNode)
  .addNode("evaluate", forcedEvaluationNode)
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

const agentGraph = graph.compile();

async function main(): Promise<void> {
  const result = await agentGraph.invoke({
    projectId: "cmtgx0qbc0003lrh8t604v78b",
    query: "Summarize what changed in the project this quarter and identify basic risks.",
  });

  console.log("\n========================================");
  console.log("FINAL GRAPH LOOP TEST");
  console.log("========================================");

  console.log(
    JSON.stringify(
      {
        retrievalIteration: result.retrievalIteration,
        evidenceSufficient: result.evidenceSufficient,
        missingEvidence: result.missingEvidence,
        retrievedChunks: result.retrievedChunks.length,
        answerLength: result.answer.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
