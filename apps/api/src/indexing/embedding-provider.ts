import { GeminiEmbeddingProvider } from "@project-intelligence/ai";

import { env } from "../config/env";

export function createEmbeddingProvider(): GeminiEmbeddingProvider {
  return new GeminiEmbeddingProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.EMBEDDING_MODEL,
    dimensions: env.EMBEDDING_DIMENSIONS,
  });
}