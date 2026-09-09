import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentState } from "../state";

const { embedQueryMock, searchSimilarMemoriesMock } = vi.hoisted(() => ({
  embedQueryMock: vi.fn(),
  searchSimilarMemoriesMock: vi.fn(),
}));

vi.mock("../../indexing/embedding-provider", () => ({
  createEmbeddingProvider: vi.fn(() => ({
    embedQuery: embedQueryMock,
  })),
}));

vi.mock("../../modules/memory/memory.repository", () => ({
  searchSimilarMemories: searchSimilarMemoriesMock,
}));

import { retrieveMemories } from "./retrieve-memories";

const embedding = Array.from({ length: 768 }, () => 0.1);

describe("retrieveMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    embedQueryMock.mockResolvedValue(embedding);
    searchSimilarMemoriesMock.mockResolvedValue([]);
  });

  it("embeds the query and retrieves relevant project memories", async () => {
    searchSimilarMemoriesMock.mockResolvedValue([
      {
        id: "memory-1",
        type: "DECISION",
        content: "Use Redis for caching.",
        similarity: 0.94,
      },
      {
        id: "memory-2",
        type: "PREFERENCE",
        content: "Prefer Redis over in-memory caching.",
        similarity: 0.91,
      },
    ]);

    const result = await retrieveMemories({
      projectId: "project-1",
      query: "What did we decide about caching?",
    } as unknown as AgentState);

    expect(embedQueryMock).toHaveBeenCalledWith("What did we decide about caching?");

    expect(searchSimilarMemoriesMock).toHaveBeenCalledWith("project-1", embedding, 5);

    expect(result).toEqual({
      memories: [
        {
          id: "memory-1",
          type: "DECISION",
          content: "Use Redis for caching.",
        },
        {
          id: "memory-2",
          type: "PREFERENCE",
          content: "Prefer Redis over in-memory caching.",
        },
      ],
    });
  });

  it("returns an empty memory list when no relevant memories exist", async () => {
    const result = await retrieveMemories({
      projectId: "project-1",
      query: "What database are we using?",
    } as unknown as AgentState);

    expect(embedQueryMock).toHaveBeenCalledWith("What database are we using?");

    expect(searchSimilarMemoriesMock).toHaveBeenCalledWith("project-1", embedding, 5);

    expect(result).toEqual({
      memories: [],
    });
  });

  it("uses the project id when searching memories", async () => {
    await retrieveMemories({
      projectId: "project-123",
      query: "What was previously decided?",
    } as unknown as AgentState);

    expect(searchSimilarMemoriesMock).toHaveBeenCalledWith("project-123", embedding, 5);
  });
});
