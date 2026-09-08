/**
 * A single test case used to evaluate the Project Intelligence Agent.
 */
export interface EvaluationCase {
  /**
   * Human-readable name for the test case.
   */
  name: string;

  /**
   * The question/query sent to the agent.
   */
  question: string;

  /**
   * Expected characteristics of a good answer.
   */
  expectedAnswer: string;

  /**
   * Optional project ID used for the evaluation.
   */
  projectId?: string;

  /**
   * Optional conversation ID used for the evaluation.
   */
  conversationId?: string;
}

/**
 * Result produced by running one evaluation case.
 */
export interface EvaluationResult {
  /**
   * Name of the evaluation case.
   */
  name: string;

  /**
   * The original question.
   */
  question: string;

  /**
   * Agent's generated answer.
   */
  answer: string;

  /**
   * Expected answer characteristics.
   */
  expectedAnswer: string;

  /**
   * Evaluation score between 0 and 1.
   */
  score: number;

  /**
   * Optional explanation from the evaluator.
   */
  reasoning?: string;
}
