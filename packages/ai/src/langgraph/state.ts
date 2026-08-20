/**
 * Future LangGraph agent state.
 *
 * This is a plain TypeScript sketch of the state that the agent workflow will
 * carry between nodes. The actual graph (edges, reducers, channels) will be
 * defined in a later phase. Nothing here is wired into a running graph yet.
 */
export interface AgentState {
  /** Owning user / workspace / conversation context. */
  userId?: string;
  workspaceId?: string;
  conversationId?: string;

  /** The question lifecycle. */
  originalQuestion?: string;
  normalizedQuestion?: string;

  /** Planning and execution. */
  plan?: string[];
  currentStep?: string;
  toolCalls?: unknown[];

  /** Retrieved context. */
  retrievedDocuments?: unknown[];
  retrievedMemories?: unknown[];
  evidence?: unknown[];

  /** Reasoning. */
  intermediateFindings?: string[];
  unresolvedQuestions?: string[];

  /** Answer output. */
  answerDraft?: string;
  citations?: unknown[];
  confidence?: number;

  /** Diagnostics. */
  errors?: unknown[];
  runMetadata?: Record<string, unknown>;
}
