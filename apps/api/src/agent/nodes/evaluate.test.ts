import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentState } from "../state";

const { createLLMMock, invokeJsonMock } = vi.hoisted(() => ({
  createLLMMock: vi.fn(),
  invokeJsonMock: vi.fn(),
}));

vi.mock("@project-intelligence/ai", () => ({
  createLLMFromEnv: createLLMMock,
}));

vi.mock("../llm-json", () => ({
  invokeJson: invokeJsonMock,
}));

vi.mock("../../config/env", () => ({
  env: {
    LLM_PROVIDER: "opencode",
    LLM_MODEL: "test-model",
    OPENCODE_API_KEY: "test-key",
  },
}));

import { evaluateNode } from "./evaluate";

describe("evaluateNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createLLMMock.mockReturnValue({
      invoke: vi.fn(),
    });
  });

  it("returns sufficient evidence when the evaluator says the context is sufficient", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse({
        evidenceSufficient: true,
        missingEvidence: [],
      }),
    );

    const result = await evaluateNode({
      projectId: "project-1",
      conversationId: "conversation-1",
      query: "How is Redis used?",
      memories: [
        {
          id: "memory-1",
          type: "DECISION",
          content: "Use Redis for caching.",
        },
      ],
      subQuestions: [
        {
          question: "How is Redis used?",
          strategy: "semantic",
        },
      ],
      retrievedChunks: [
        {
          id: "chunk-1",
          documentId: "doc-1",
          content: "The application uses Redis as a caching layer.",
          chunkIndex: 0,
          title: "Caching Architecture",
          similarity: 0.95,
        },
      ],
      evidence: [
        {
          subQuestion: "How is Redis used?",
          chunks: [
            {
              id: "chunk-1",
              documentId: "doc-1",
              content: "The application uses Redis as a caching layer.",
              chunkIndex: 0,
              title: "Caching Architecture",
              similarity: 0.95,
            },
          ],
        },
      ],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      evidenceSufficient: true,
      missingEvidence: [],
    });

    expect(createLLMMock).toHaveBeenCalledWith(
      "opencode",
      "test-model",
      "test-key",
      "conversation-1",
    );

    expect(invokeJsonMock).toHaveBeenCalledTimes(1);
  });

  it("returns missing evidence when the evaluator says the context is insufficient", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse({
        evidenceSufficient: false,
        missingEvidence: [
          "Find the pull request that introduced the Redis caching layer.",
          "Verify when the change was merged.",
        ],
      }),
    );

    const result = await evaluateNode({
      projectId: "project-1",
      query: "When was Redis caching introduced?",
      memories: [],
      subQuestions: [
        {
          question: "When was Redis caching introduced?",
          strategy: "semantic",
        },
      ],
      retrievedChunks: [],
      evidence: [
        {
          subQuestion: "When was Redis caching introduced?",
          chunks: [],
        },
      ],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      evidenceSufficient: false,
      missingEvidence: [
        "Find the pull request that introduced the Redis caching layer.",
        "Verify when the change was merged.",
      ],
    });
  });

  it("rejects invalid evaluator output", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse({
        evidenceSufficient: "yes",
        missingEvidence: [],
      }),
    );

    await expect(
      evaluateNode({
        projectId: "project-1",
        query: "What are we using for caching?",
        memories: [],
        subQuestions: [
          {
            question: "What are we using for caching?",
            strategy: "semantic",
          },
        ],
        retrievedChunks: [],
        evidence: [
          {
            subQuestion: "What are we using for caching?",
            chunks: [],
          },
        ],
        evidenceSufficient: false,
        missingEvidence: [],
        retrievalIteration: 0,
        context: "",
        answer: "",
      } as unknown as AgentState),
    ).rejects.toThrow(
      'LLM evaluation response must contain "evidenceSufficient" boolean and "missingEvidence" string array.',
    );
  });
});
