import { decomposeNode } from "../agent/nodes/decompose";
import { retrieveNode } from "../agent/nodes/retrieve";
import { evaluateNode } from "../agent/nodes/evaluate";
import { refineNode } from "../agent/nodes/refine";
import type { AgentState } from "../agent/state";

const PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

const query = "Summarize what changed in the project this quarter and identify basic risks.";

async function main(): Promise<void> {
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

  const stateAfterEvaluation: AgentState = {
    ...stateAfterRetrieval,
    evidenceSufficient: evaluation.evidenceSufficient ?? false,
    missingEvidence: evaluation.missingEvidence ?? [],
  };

  console.log("\n========================================");
  console.log("INITIAL EVALUATION");
  console.log("========================================");
  console.log(
    JSON.stringify(
      {
        evidenceSufficient: stateAfterEvaluation.evidenceSufficient,
        missingEvidence: stateAfterEvaluation.missingEvidence,
      },
      null,
      2,
    ),
  );

  if (!stateAfterEvaluation.evidenceSufficient) {
    const refinement = await refineNode(stateAfterEvaluation);

    console.log("\n========================================");
    console.log("REFINED QUESTIONS");
    console.log("========================================");
    console.log(
      JSON.stringify(
        {
          retrievalIteration: refinement.retrievalIteration,
          subQuestions: refinement.subQuestions,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
