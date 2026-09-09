import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  retrieveMemoriesMock,
  decomposeMock,
  retrieveMock,
  evaluateMock,
  refineMock,
  buildContextMock,
  generateMock,
} = vi.hoisted(() => ({
  retrieveMemoriesMock: vi.fn(),
  decomposeMock: vi.fn(),
  retrieveMock: vi.fn(),
  evaluateMock: vi.fn(),
  refineMock: vi.fn(),
  buildContextMock: vi.fn(),
  generateMock: vi.fn(),
}));

vi.mock("./nodes/retrieve-memories", () => ({
  retrieveMemories: retrieveMemoriesMock,
}));

vi.mock("./nodes/decompose", () => ({
  decomposeNode: decomposeMock,
}));

vi.mock("./nodes/retrieve", () => ({
  retrieveNode: retrieveMock,
}));

vi.mock("./nodes/evaluate", () => ({
  evaluateNode: evaluateMock,
}));

vi.mock("./nodes/refine", () => ({
  refineNode: refineMock,
}));

vi.mock("./nodes/context", () => ({
  buildContextNode: buildContextMock,
}));

vi.mock("./nodes/generate", () => ({
  generateNode: generateMock,
}));

import { agentGraph } from "./graph";

describe("agentGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    retrieveMemoriesMock.mockResolvedValue({
      memories: [],
    });

    decomposeMock.mockResolvedValue({
      subQuestions: [
        {
          question: "Find the Redis implementation.",
          strategy: "semantic",
          semanticQuery: "Redis implementation",
        },
      ],
    });

    retrieveMock.mockResolvedValue({
      retrievedChunks: [
        {
          chunkId: "chunk-1",
          documentId: "doc-1",
          content: "Redis is used for caching.",
          metadata: {
            title: "Redis caching",
          },
          similarity: 0.95,
        },
      ],
      evidence: [
        {
          chunkId: "chunk-1",
          documentId: "doc-1",
          content: "Redis is used for caching.",
          metadata: {
            title: "Redis caching",
          },
          similarity: 0.95,
        },
      ],
    });

    evaluateMock.mockResolvedValue({
      evidenceSufficient: true,
      missingEvidence: [],
    });

    buildContextMock.mockResolvedValue({
      context: "Source 1: Redis is used for caching.",
    });

    generateMock.mockResolvedValue({
      answer: "Redis is used for caching. [Source 1]",
    });
  });

  it("runs the graph through the successful path", async () => {
    const result = await agentGraph.invoke({
      projectId: "project-1",
      query: "How is Redis used?",
      conversationHistory: [],
      retrievalIteration: 0,
    });

    expect(result.answer).toBe("Redis is used for caching. [Source 1]");

    expect(retrieveMemoriesMock).toHaveBeenCalledTimes(1);
    expect(decomposeMock).toHaveBeenCalledTimes(1);
    expect(retrieveMock).toHaveBeenCalledTimes(1);
    expect(evaluateMock).toHaveBeenCalledTimes(1);

    expect(refineMock).not.toHaveBeenCalled();

    expect(buildContextMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("refines retrieval when the first evaluation is insufficient", async () => {
    evaluateMock
      .mockResolvedValueOnce({
        evidenceSufficient: false,
        missingEvidence: ["Find the pull request that introduced Redis."],
      })
      .mockResolvedValueOnce({
        evidenceSufficient: true,
        missingEvidence: [],
      });

    refineMock.mockResolvedValue({
      subQuestions: [
        {
          question: "Find the pull request that introduced Redis.",
          strategy: "semantic",
          semanticQuery: "Redis pull request",
        },
      ],
      retrievalIteration: 1,
    });

    retrieveMock
      .mockResolvedValueOnce({
        retrievedChunks: [],
        evidence: [],
      })
      .mockResolvedValueOnce({
        retrievedChunks: [
          {
            chunkId: "chunk-2",
            documentId: "doc-2",
            content: "PR #42 introduced Redis caching.",
            metadata: {
              title: "Add Redis caching",
            },
            similarity: 0.97,
          },
        ],
        evidence: [
          {
            chunkId: "chunk-2",
            documentId: "doc-2",
            content: "PR #42 introduced Redis caching.",
            metadata: {
              title: "Add Redis caching",
            },
            similarity: 0.97,
          },
        ],
      });

    generateMock.mockResolvedValue({
      answer: "PR #42 introduced Redis caching. [Source 1]",
    });

    const result = await agentGraph.invoke({
      projectId: "project-1",
      query: "Which PR introduced Redis?",
      conversationHistory: [],
      retrievalIteration: 0,
    });

    expect(result.answer).toBe("PR #42 introduced Redis caching. [Source 1]");

    expect(retrieveMock).toHaveBeenCalledTimes(2);
    expect(evaluateMock).toHaveBeenCalledTimes(2);
    expect(refineMock).toHaveBeenCalledTimes(1);

    expect(buildContextMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledTimes(1);

    expect(refineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        retrievalIteration: 0,
        evidenceSufficient: false,
        missingEvidence: ["Find the pull request that introduced Redis."],
      }),
      expect.anything(),
    );

    expect(retrieveMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        retrievalIteration: 1,
      }),
      expect.anything(),
    );
  });
});
