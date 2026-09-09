import { beforeEach, describe, expect, it, vi } from "vitest";

const { retrieveMock, activityMock } = vi.hoisted(() => ({
  retrieveMock: vi.fn(),
  activityMock: vi.fn(),
}));

vi.mock("../../retrieval/retriever", () => ({
  VectorRetriever: vi.fn().mockImplementation(function () {
    return {
      retrieve: retrieveMock,
    };
  }),
}));

vi.mock("../../indexing/embedding-provider", () => ({
  createEmbeddingProvider: vi.fn(() => ({})),
}));

vi.mock("./retrieve-activity", () => ({
  retrieveActivity: activityMock,
}));

vi.mock("../../retrieval/temporal", () => ({
  resolveTemporalRange: vi.fn(() => ({
    from: new Date("2026-01-01"),
    to: new Date("2026-03-31"),
  })),
}));

import { retrieveNode } from "./retrieve";

describe("retrieveNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retrieves semantic evidence", async () => {
    retrieveMock.mockResolvedValue([
      {
        id: "chunk-1",
        documentId: "doc-1",
        content: "React Flight serializes server components.",
        chunkIndex: 0,
        title: "Architecture",
        similarity: 0.92,
      },
    ]);

    const result = await retrieveNode({
      projectId: "project-1",
      query: "What is Flight?",
      subQuestions: [
        {
          question: "What is Flight?",
          strategy: "semantic",
        },
      ],
    } as any);

    expect(retrieveMock).toHaveBeenCalledWith("What is Flight?", {
      projectId: "project-1",
      topK: 5,
    });

    expect(result.retrievedChunks).toHaveLength(1);
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence?.[0]?.chunks).toHaveLength(1);
  });

  it("deduplicates identical chunks across retrieval plans", async () => {
    const duplicate = {
      id: "chunk-1",
      documentId: "doc-1",
      content: "Same chunk",
      chunkIndex: 0,
      title: "Doc",
      similarity: 1,
    };

    retrieveMock.mockResolvedValueOnce([duplicate]).mockResolvedValueOnce([duplicate]);

    const result = await retrieveNode({
      projectId: "project-1",
      query: "Architecture",
      subQuestions: [
        { question: "Q1", strategy: "semantic" },
        { question: "Q2", strategy: "semantic" },
      ],
    } as any);

    expect(result.retrievedChunks).toHaveLength(1);
    expect(result.evidence).toHaveLength(2);
  });

  it("converts activity results into retrieved chunks", async () => {
    activityMock.mockResolvedValue([
      {
        id: "activity-1",
        title: "PR merged",
        content: "Merged authentication improvements",
        url: "https://github.com/example/pr/42",
        activityAt: new Date("2026-02-15"),
        activityDateField: "mergedAt",
      },
    ]);

    const result = await retrieveNode({
      projectId: "project-1",
      query: "Merged PRs",
      subQuestions: [
        {
          question: "Merged PRs this quarter",
          strategy: "activity",
          activityConstraints: {
            dateField: "mergedAt",
            temporalRange: "this_quarter",
            exhaustive: true,
          },
        },
      ],
    } as any);

    expect(activityMock).toHaveBeenCalled();

    expect(result.retrievedChunks).toHaveLength(1);

    expect(result.retrievedChunks?.[0]).toMatchObject({
      id: "activity-1",
      documentId: "activity-1",
      title: "PR merged",
      activityDateField: "mergedAt",
    });
  });
});
