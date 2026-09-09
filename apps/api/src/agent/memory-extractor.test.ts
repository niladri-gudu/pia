import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@project-intelligence/ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createLLMFromEnv: vi.fn(() => ({
    invoke: invokeMock,
  })),
}));

import { extractMemories } from "./memory-extractor";

describe("extractMemories", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("returns no memories for an empty conversation", async () => {
    const result = await extractMemories("test-conversation", []);

    expect(result).toEqual({
      memories: [],
    });

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("extracts valid memories from an LLM response", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        memories: [
          {
            type: "DECISION",
            content: "The project will use Redis for caching.",
          },
        ],
      }),
    });

    const result = await extractMemories("test-conversation", [
      {
        role: "USER",
        content: "Let's use Redis for caching.",
      },
    ]);

    expect(result).toEqual({
      memories: [
        {
          type: "DECISION",
          content: "The project will use Redis for caching.",
        },
      ],
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid memory types", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        memories: [
          {
            type: "RANDOM_TYPE",
            content: "This should not be accepted.",
          },
        ],
      }),
    });

    await expect(
      extractMemories("test-conversation", [
        {
          role: "USER",
          content: "Some project discussion.",
        },
      ]),
    ).rejects.toThrow();
  });

  it("rejects malformed JSON from the LLM", async () => {
    invokeMock.mockResolvedValue({
      content: "not valid json",
    });

    await expect(
      extractMemories("test-conversation", [
        {
          role: "USER",
          content: "Some project discussion.",
        },
      ]),
    ).rejects.toThrow();
  });
});
