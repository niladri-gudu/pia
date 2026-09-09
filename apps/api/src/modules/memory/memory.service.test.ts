import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  embedQueryMock,
  createMemoryMock,
  findProjectMemoriesMock,
  saveMemoryEmbeddingMock,
  findSimilarMemoryMock,
} = vi.hoisted(() => ({
  embedQueryMock: vi.fn(),
  createMemoryMock: vi.fn(),
  findProjectMemoriesMock: vi.fn(),
  saveMemoryEmbeddingMock: vi.fn(),
  findSimilarMemoryMock: vi.fn(),
}));

vi.mock("../../indexing/embedding-provider", () => ({
  createEmbeddingProvider: vi.fn(() => ({
    embedQuery: embedQueryMock,
  })),
}));

vi.mock("./memory.repository", () => ({
  createMemory: createMemoryMock,
  findProjectMemories: findProjectMemoriesMock,
  saveMemoryEmbedding: saveMemoryEmbeddingMock,
  findSimilarMemory: findSimilarMemoryMock,
}));

import { addProjectMemory, getProjectMemories } from "./memory.service";

const embedding = Array.from({ length: 768 }, () => 0.1);

describe("addProjectMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    embedQueryMock.mockResolvedValue(embedding);
    findSimilarMemoryMock.mockResolvedValue(null);
    saveMemoryEmbeddingMock.mockResolvedValue(undefined);
  });

  it("creates and embeds a new memory when no duplicate exists", async () => {
    const memory = {
      id: "memory-1",
      projectId: "project-1",
      type: "DECISION" as const,
      content: "Use Redis for caching.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    createMemoryMock.mockResolvedValue(memory);

    const result = await addProjectMemory({
      projectId: "project-1",
      type: "DECISION",
      content: "Use Redis for caching.",
    });

    expect(embedQueryMock).toHaveBeenCalledWith("Use Redis for caching.");

    expect(findSimilarMemoryMock).toHaveBeenCalledWith("project-1", "DECISION", embedding);

    expect(createMemoryMock).toHaveBeenCalledWith({
      projectId: "project-1",
      type: "DECISION",
      content: "Use Redis for caching.",
    });

    expect(saveMemoryEmbeddingMock).toHaveBeenCalledWith("memory-1", embedding);

    expect(result).toEqual(memory);
  });

  it("does not create a duplicate memory", async () => {
    const existingMemory = {
      id: "memory-existing",
      projectId: "project-1",
      type: "DECISION" as const,
      content: "Use Redis for caching.",
      similarity: 0.95,
    };

    findSimilarMemoryMock.mockResolvedValue(existingMemory);

    const result = await addProjectMemory({
      projectId: "project-1",
      type: "DECISION",
      content: "Redis will be used as the caching layer.",
    });

    expect(findSimilarMemoryMock).toHaveBeenCalled();
    expect(createMemoryMock).not.toHaveBeenCalled();
    expect(saveMemoryEmbeddingMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      id: "memory-existing",
      projectId: "project-1",
      type: "DECISION",
      content: "Use Redis for caching.",
      createdAt: null,
      updatedAt: null,
    });
  });
});

describe("getProjectMemories", () => {
  it("returns memories for a project", async () => {
    const memories = [
      {
        id: "memory-1",
        projectId: "project-1",
        type: "DECISION" as const,
        content: "Use Redis for caching.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findProjectMemoriesMock.mockResolvedValue(memories);

    const result = await getProjectMemories("project-1");

    expect(findProjectMemoriesMock).toHaveBeenCalledWith("project-1");
    expect(result).toEqual(memories);
  });
});
