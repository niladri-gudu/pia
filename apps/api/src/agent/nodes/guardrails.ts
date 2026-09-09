import type { AgentState } from "../state";
import { logger } from "../../lib/logger";

/**
 * Safe response used when the generated answer fails the output guardrail.
 * Failing the whole request here would waste a completed retrieval run and
 * surface an internal error to the user, so a failed answer is replaced
 * with an honest "cannot verify" response instead.
 */
const INSUFFICIENT_EVIDENCE_FALLBACK =
  "I could not verify the answer to this question from the available project context, " +
  "so I won't speculate. Try rephrasing the question, or ask about something covered by " +
  "the project's issues, pull requests or commits.";

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
 *
 * Instead of failing the run, a non-conforming answer is replaced with the
 * safe insufficient-evidence fallback so the conversation always receives
 * an honest, grounded response.
 */
export function outputGuardrailNode(state: AgentState): Partial<AgentState> {
  const answer = state.answer.trim();

  if (!answer) {
    logger.warn("[agent] Output guardrail: empty answer, using fallback response");

    return {
      answer: INSUFFICIENT_EVIDENCE_FALLBACK,
      context: state.context,
    };
  }

  const sourceCount = state.retrievedChunks.length;

  const sourceReferences = [...answer.matchAll(/\[Source\s+(\d+)\]/gi)];

  for (const match of sourceReferences) {
    const sourceNumber = Number(match[1]);

    if (sourceNumber < 1 || sourceNumber > sourceCount) {
      logger.warn(
        `[agent] Output guardrail: invalid source reference [Source ${sourceNumber}], using fallback response`,
      );

      return {
        answer: INSUFFICIENT_EVIDENCE_FALLBACK,
        context: state.context,
      };
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
      lowerAnswer.includes("unable to verify") ||
      lowerAnswer.includes("won't speculate") ||
      lowerAnswer.includes("not covered by");

    if (!acknowledgesUncertainty) {
      logger.warn("[agent] Output guardrail: answer does not acknowledge insufficient evidence");

      return {
        answer: INSUFFICIENT_EVIDENCE_FALLBACK,
        context: state.context,
      };
    }
  }

  return {
    answer,
  };
}
