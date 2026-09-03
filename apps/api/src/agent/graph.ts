import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { buildContextNode } from "./nodes/context";
import { generateNode } from "./nodes/generate";
import type { AgentState } from "./state";

const AgentStateAnnotation = Annotation.Root({
  projectId: Annotation<string>,
    query: Annotation<string>,
    retrievedChunks: Annotation<AgentState["retrievedChunks"]>({
      reducer: (_, next) => next,
      default: () => [],
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

const graph = new StateGraph(AgentStateAnnotation)
  .addNode("retrieve", retrieveNode)
  .addNode("buildContext", buildContextNode)
  .addNode("generate", generateNode)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "buildContext")
  .addEdge("buildContext", "generate")
  .addEdge("generate", END);

export const agentGraph = graph.compile();
