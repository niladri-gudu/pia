import { decomposeNode } from "../agent/nodes/decompose";
import { retrieveNode } from "../agent/nodes/retrieve";
import { evaluateNode } from "../agent/nodes/evaluate";
import type { AgentState } from "../agent/state";

const PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

const queries = [
  "Summarize what changed in the project this quarter and identify basic risks.",
  "What causes a fiber to remount when a component kind changes?",
];

async function main(): Promise<void> {
  for (const query of queries) {
    const initialState: AgentState = {
      projectId: PROJECT_ID,
      query,
      subQuestions: [],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    };

    const decomposition = await decomposeNode(initialState);

    const stateAfterDecompose: AgentState = {
      ...initialState,
      subQuestions: decomposition.subQuestions ?? [],
    };

    const retrieval = await retrieveNode(stateAfterDecompose);

    const stateAfterRetrieval: AgentState = {
      ...stateAfterDecompose,
      retrievedChunks: retrieval.retrievedChunks ?? [],
      evidence: retrieval.evidence ?? [],
    };

    const evaluation = await evaluateNode(stateAfterRetrieval);

    console.log("\n========================================");
    console.log(`QUERY: ${query}`);
    console.log("========================================");
    console.log("SUBQUESTIONS:");
    console.log(JSON.stringify(stateAfterDecompose.subQuestions, null, 2));
    console.log("\nRETRIEVED CHUNKS:");
    console.log(stateAfterRetrieval.retrievedChunks.length);
    console.log("\nEVIDENCE SUFFICIENT:");
    console.log(evaluation.evidenceSufficient);
    console.log("\nMISSING EVIDENCE:");
    console.log(JSON.stringify(evaluation.missingEvidence, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
