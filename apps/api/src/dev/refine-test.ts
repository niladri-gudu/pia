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

  // ----------------------------------------
  // 1. DECOMPOSE
  // ----------------------------------------

  const decomposition = await decomposeNode(initialState);

  const stateAfterDecompose: AgentState = {
    ...initialState,
    subQuestions: decomposition.subQuestions ?? [],
  };

  console.log("\n========================================");
  console.log("INITIAL RETRIEVAL PLANS");
  console.log("========================================");

  console.log(JSON.stringify(stateAfterDecompose.subQuestions, null, 2));

  // ----------------------------------------
  // 2. INITIAL RETRIEVAL
  // ----------------------------------------

  const retrieval = await retrieveNode(stateAfterDecompose);

  const stateAfterRetrieval: AgentState = {
    ...stateAfterDecompose,
    retrievedChunks: retrieval.retrievedChunks ?? [],
    evidence: retrieval.evidence ?? [],
  };

  console.log("\n========================================");
  console.log("INITIAL RETRIEVAL");
  console.log("========================================");

  console.log(`Retrieved ${stateAfterRetrieval.retrievedChunks.length} unique chunks`);

  // ----------------------------------------
  // 3. INITIAL EVALUATION
  // ----------------------------------------

  const stateAfterEvaluation: AgentState = {
    ...stateAfterRetrieval,
    evidenceSufficient: false,
    missingEvidence: [
      "Pull requests merged during this quarter, including their merge dates and technical changes.",
      "Specific risks, regressions, or security issues introduced by those changes.",
    ],
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

  // ----------------------------------------
  // 4. REFINE
  // ----------------------------------------

  if (!stateAfterEvaluation.evidenceSufficient) {
    const refinement = await refineNode(stateAfterEvaluation);

    const stateAfterRefinement: AgentState = {
      ...stateAfterEvaluation,
      subQuestions: refinement.subQuestions ?? [],
      retrievalIteration: refinement.retrievalIteration ?? 1,
    };

    console.log("\n========================================");
    console.log("REFINED RETRIEVAL PLANS");
    console.log("========================================");

    console.log(JSON.stringify(stateAfterRefinement.subQuestions, null, 2));

    // ----------------------------------------
    // 5. SECOND RETRIEVAL
    // ----------------------------------------

    const secondRetrieval = await retrieveNode(stateAfterRefinement);

    const stateAfterSecondRetrieval: AgentState = {
      ...stateAfterRefinement,
      retrievedChunks: secondRetrieval.retrievedChunks ?? [],
      evidence: secondRetrieval.evidence ?? [],
    };

    console.log("\n========================================");
    console.log("SECOND RETRIEVAL");
    console.log("========================================");

    console.log(`Retrieved ${stateAfterSecondRetrieval.retrievedChunks.length} unique chunks`);

    // ----------------------------------------
    // 6. SECOND EVALUATION
    // ----------------------------------------

    const secondEvaluation = await evaluateNode(stateAfterSecondRetrieval);

    const stateAfterSecondEvaluation: AgentState = {
      ...stateAfterSecondRetrieval,
      evidenceSufficient: secondEvaluation.evidenceSufficient ?? false,
      missingEvidence: secondEvaluation.missingEvidence ?? [],
    };

    console.log("\n========================================");
    console.log("SECOND EVALUATION");
    console.log("========================================");

    console.log(
      JSON.stringify(
        {
          evidenceSufficient: stateAfterSecondEvaluation.evidenceSufficient,
          missingEvidence: stateAfterSecondEvaluation.missingEvidence,
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
