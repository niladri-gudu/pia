import type { AgentState } from "../state";

/**
 * Validates the incoming agent query before retrieval begins.
 */
export function inputGuardrailNode(state: AgentState): Partial<AgentState> {
  const query = state.query.trim();

  if (!query) {
    throw new Error("Query cannot be empty.");
  }

  if (query.length > 4000) {
    throw new Error("Query is too long. Maximum length is 4000 characters.");
  }

  return {
    query,
  };
}

/**
 * Validates the generated answer against the available agent context.
 */
export function outputGuardrailNode(state: AgentState): Partial<AgentState> {
  const answer = state.answer.trim();

  if (!answer) {
    throw new Error("Generated answer cannot be empty.");
  }

  const sourceCount = state.retrievedChunks.length;

  const sourceReferences = [...answer.matchAll(/\[Source\s+(\d+)\]/gi)];

  for (const match of sourceReferences) {
    const sourceNumber = Number(match[1]);

    if (sourceNumber < 1 || sourceNumber > sourceCount) {
      throw new Error(
        `Generated answer contains invalid source reference: [Source ${sourceNumber}].`,
      );
    }
  }

  if (!state.evidenceSufficient) {
    const lowerAnswer = answer.toLowerCase();

    const acknowledgesUncertainty =
      lowerAnswer.includes("not enough information") ||
      lowerAnswer.includes("could not be verified") ||
      lowerAnswer.includes("cannot be verified") ||
      lowerAnswer.includes("not available") ||
      lowerAnswer.includes("insufficient evidence") ||
      lowerAnswer.includes("unable to verify");

    if (!acknowledgesUncertainty) {
      throw new Error("Generated answer does not acknowledge insufficient evidence.");
    }
  }

  return {
    answer,
  };
}
