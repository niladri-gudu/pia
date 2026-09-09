import { describe, expect, it } from "vitest";
import type { AgentState } from "../state";
import { inputGuardrailNode, outputGuardrailNode } from "./guardrails";

describe("inputGuardrailNode", () => {
  it("rejects an empty query", () => {
    expect(() => inputGuardrailNode({ query: "   " } as unknown as AgentState)).toThrow("Query cannot be empty.");
  });

  it("rejects queries longer than 4000 characters", () => {
    expect(() => inputGuardrailNode({ query: "a".repeat(4001) } as unknown as AgentState)).toThrow(
      "Query is too long. Maximum length is 4000 characters.",
    );
  });

  it("trims and accepts a valid query", () => {
    const result = inputGuardrailNode({
      query: "  What is React?  ",
    } as unknown as AgentState);

    expect(result.query).toBe("What is React?");
  });
});

describe("outputGuardrailNode", () => {
  const FALLBACK_SNIPPET = "could not verify";

  it("replaces an empty answer with the fallback response", () => {
    const result = outputGuardrailNode({
      answer: "   ",
      retrievedChunks: [],
      evidenceSufficient: true,
    } as unknown as AgentState);

    expect(result.answer).toContain(FALLBACK_SNIPPET);
  });

  it("replaces answers with invalid source references", () => {
    const result = outputGuardrailNode({
      answer: "React uses this architecture. [Source 99]",
      retrievedChunks: [{}, {}, {}],
      evidenceSufficient: true,
    } as unknown as AgentState);

    expect(result.answer).toContain(FALLBACK_SNIPPET);
  });

  it("accepts valid source references", () => {
    const result = outputGuardrailNode({
      answer: "React uses this architecture. [Source 2]",
      retrievedChunks: [{}, {}, {}],
      evidenceSufficient: true,
    } as unknown as AgentState);

    expect(result.answer).toBe("React uses this architecture. [Source 2]");
  });

  it("replaces unsupported answers that do not acknowledge uncertainty", () => {
    const result = outputGuardrailNode({
      answer: "I am certain the CEO uses Rust.",
      retrievedChunks: [],
      evidenceSufficient: false,
    } as unknown as AgentState);

    expect(result.answer).toContain(FALLBACK_SNIPPET);
  });

  it("accepts an answer that acknowledges insufficient evidence", () => {
    const result = outputGuardrailNode({
      answer: "This information could not be verified from the available project context.",
      retrievedChunks: [],
      evidenceSufficient: false,
    } as unknown as AgentState);

    expect(result.answer).toContain("could not be verified");
  });
});
