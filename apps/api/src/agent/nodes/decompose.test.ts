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

import { decomposeNode } from "./decompose";

describe("decomposeNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createLLMMock.mockReturnValue({
      invoke: vi.fn(),
    });
  });

  it("creates semantic retrieval plans", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse([
        {
          question: "Find the Redis caching implementation.",
          strategy: "semantic",
          semantic_query: "Redis caching implementation",
        },
      ]),
    );

    const result = await decomposeNode({
      projectId: "project-1",
      query: "How is Redis used?",
      conversationHistory: [],
      subQuestions: [],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      subQuestions: [
        {
          question: "Find the Redis caching implementation.",
          strategy: "semantic",
          semanticQuery: "Redis caching implementation",
        },
      ],
    });

    expect(createLLMMock).toHaveBeenCalledWith("opencode", "test-model", "test-key", undefined);

    expect(invokeJsonMock).toHaveBeenCalledTimes(1);
  });

  it("creates activity plans with temporal constraints", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse([
        {
          question: "Find all PRs merged this quarter.",
          strategy: "activity",
          activity_constraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ]),
    );

    const result = await decomposeNode({
      projectId: "project-1",
      query: "Which PRs were merged this quarter?",
      conversationHistory: [],
      subQuestions: [],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      subQuestions: [
        {
          question: "Find all PRs merged this quarter.",
          strategy: "activity",
          activityConstraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ],
    });
  });

  it("accepts wrapped retrieval_plans responses", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse({
        retrieval_plans: [
          {
            question: "Find architecture documentation.",
            strategy: "semantic",
          },
        ],
      }),
    );

    const result = await decomposeNode({
      projectId: "project-1",
      query: "Explain the architecture.",
      conversationHistory: [],
      subQuestions: [],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result.subQuestions).toEqual([
      {
        question: "Find architecture documentation.",
        strategy: "semantic",
      },
    ]);
  });

  it("rejects activity plans without activity constraints", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse([
        {
          question: "Find recent project activity.",
          strategy: "activity",
        },
      ]),
    );

    await expect(
      decomposeNode({
        projectId: "project-1",
        query: "What happened recently?",
        conversationHistory: [],
        subQuestions: [],
        retrievedChunks: [],
        evidence: [],
        evidenceSufficient: false,
        missingEvidence: [],
        retrievalIteration: 0,
        context: "",
        answer: "",
      } as unknown as AgentState),
    ).rejects.toThrow('Retrieval plan 0 with strategy "activity" is missing activity_constraints.');
  });

  it("rejects invalid temporal ranges", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: { parse: (value: unknown) => unknown }) =>
      parse([
        {
          question: "Find project activity.",
          strategy: "activity",
          activity_constraints: {
            dateField: "occurredAt",
            temporalRange: "next_year",
          },
        },
      ]),
    );

    await expect(
      decomposeNode({
        projectId: "project-1",
        query: "What happened?",
        conversationHistory: [],
        subQuestions: [],
        retrievedChunks: [],
        evidence: [],
        evidenceSufficient: false,
        missingEvidence: [],
        retrievalIteration: 0,
        context: "",
        answer: "",
      } as unknown as AgentState),
    ).rejects.toThrow("Retrieval plan 0 has an invalid temporalRange");
  });
});
