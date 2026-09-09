import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { refineNode } from "./refine";

describe("refineNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createLLMMock.mockReturnValue({
      invoke: vi.fn(),
    });
  });

  it("generates targeted semantic retrieval plans and increments the iteration", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: any) =>
      parse([
        {
          strategy: "semantic",
          question: "Find the implementation of Redis caching.",
          semantic_query: "Redis caching implementation",
        },
      ]),
    );

    const result = await refineNode({
      projectId: "project-1",
      query: "When was Redis caching introduced?",
      subQuestions: [
        {
          question: "When was Redis caching introduced?",
          strategy: "semantic",
        },
      ],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: ["Find the implementation of Redis caching."],
      retrievalIteration: 0,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      subQuestions: [
        {
          question: "Find the implementation of Redis caching.",
          strategy: "semantic",
          semanticQuery: "Redis caching implementation",
        },
      ],
      retrievalIteration: 1,
    });

    expect(createLLMMock).toHaveBeenCalledWith("opencode", "test-model", "test-key", undefined);

    expect(invokeJsonMock).toHaveBeenCalledTimes(1);
  });

  it("preserves activity constraints for refined activity plans", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: any) =>
      parse([
        {
          strategy: "activity",
          question: "Find PRs merged this quarter.",
          activity_constraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ]),
    );

    const result = await refineNode({
      projectId: "project-1",
      query: "Which PRs were merged this quarter?",
      subQuestions: [
        {
          question: "Which PRs were merged this quarter?",
          strategy: "activity",
          activityConstraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: ["Find all merged PRs this quarter."],
      retrievalIteration: 1,
      context: "",
      answer: "",
    });

    expect(result).toEqual({
      subQuestions: [
        {
          question: "Find PRs merged this quarter.",
          strategy: "activity",
          activityConstraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ],
      retrievalIteration: 2,
    });
  });

  it("rejects activity plans without activity constraints", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: any) =>
      parse([
        {
          strategy: "activity",
          question: "Find relevant project activity.",
        },
      ]),
    );

    await expect(
      refineNode({
        projectId: "project-1",
        query: "What happened recently?",
        subQuestions: [],
        retrievedChunks: [],
        evidence: [],
        evidenceSufficient: false,
        missingEvidence: ["Find recent project activity."],
        retrievalIteration: 0,
        context: "",
        answer: "",
      } as any),
    ).rejects.toThrow('Refined plan 0 with strategy "activity" is missing activity_constraints.');
  });

  it("rejects invalid retrieval strategies", async () => {
    invokeJsonMock.mockImplementation(async ({ parse }: any) =>
      parse([
        {
          strategy: "database",
          question: "Find database changes.",
        },
      ]),
    );

    await expect(
      refineNode({
        projectId: "project-1",
        query: "What database changes happened?",
        subQuestions: [],
        retrievedChunks: [],
        evidence: [],
        evidenceSufficient: false,
        missingEvidence: ["Find database changes."],
        retrievalIteration: 0,
        context: "",
        answer: "",
      } as any),
    ).rejects.toThrow("Refined plan 0 has an invalid strategy.");
  });
});
