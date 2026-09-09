import { describe, expect, it } from "vitest";
import { inputGuardrailNode, outputGuardrailNode } from "./guardrails";

describe("inputGuardrailNode", () => {
  it("rejects an empty query", () => {
    expect(() => inputGuardrailNode({ query: "   " } as any)).toThrow("Query cannot be empty.");
  });

  it("rejects queries longer than 4000 characters", () => {
    expect(() => inputGuardrailNode({ query: "a".repeat(4001) } as any)).toThrow(
      "Query is too long. Maximum length is 4000 characters.",
    );
  });

  it("trims and accepts a valid query", () => {
    const result = inputGuardrailNode({
      query: "  What is React?  ",
    } as any);

    expect(result.query).toBe("What is React?");
  });
});

describe("outputGuardrailNode", () => {
  it("rejects an empty answer", () => {
    expect(() =>
      outputGuardrailNode({
        answer: "   ",
        retrievedChunks: [],
        evidenceSufficient: true,
      } as any),
    ).toThrow("Generated answer cannot be empty.");
  });

  it("rejects invalid source references", () => {
    expect(() =>
      outputGuardrailNode({
        answer: "React uses this architecture. [Source 99]",
        retrievedChunks: [{}, {}, {}],
        evidenceSufficient: true,
      } as any),
    ).toThrow("Generated answer contains invalid source reference: [Source 99].");
  });

  it("accepts valid source references", () => {
    const result = outputGuardrailNode({
      answer: "React uses this architecture. [Source 2]",
      retrievedChunks: [{}, {}, {}],
      evidenceSufficient: true,
    } as any);

    expect(result.answer).toBe("React uses this architecture. [Source 2]");
  });

  it("rejects unsupported answers that do not acknowledge uncertainty", () => {
    expect(() =>
      outputGuardrailNode({
        answer: "I am certain the CEO uses Rust.",
        retrievedChunks: [],
        evidenceSufficient: false,
      } as any),
    ).toThrow("Generated answer does not acknowledge insufficient evidence.");
  });

  it("accepts an answer that acknowledges insufficient evidence", () => {
    const result = outputGuardrailNode({
      answer: "This information could not be verified from the available project context.",
      retrievedChunks: [],
      evidenceSufficient: false,
    } as any);

    expect(result.answer).toContain("could not be verified");
  });
});
