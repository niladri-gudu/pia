import { GoogleGenAI } from "@google/genai";

import type { EmbeddingProvider } from "./types.js";

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model: string;
  dimensions: number;
}

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 120_000;

function normalizeEmbedding(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

function getRetryDelayMs(error: unknown): number {
  if (!error || typeof error !== "object") {
    return DEFAULT_RETRY_DELAY_MS;
  }

  const apiError = error as {
    error?: {
      details?: Array<{
        "@type"?: string;
        retryDelay?: string;
      }>;
    };
  };

  const retryInfo = apiError.error?.details?.find(
    (detail) =>
      detail["@type"] ===
      "type.googleapis.com/google.rpc.RetryInfo",
  );

  if (!retryInfo?.retryDelay) {
    return DEFAULT_RETRY_DELAY_MS;
  }

  const match = retryInfo.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);

  if (!match?.[1]) {
    return DEFAULT_RETRY_DELAY_MS;
  }

  const delayMs = Number(match[1]) * 1000;

  return Math.min(delayMs, MAX_RETRY_DELAY_MS);
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const apiError = error as {
    status?: number;
  };

  return apiError.status === 429;
}

async function withRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRateLimitError(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const retryDelayMs = Math.min(
        getRetryDelayMs(error) * 2 ** attempt,
        MAX_RETRY_DELAY_MS,
      );

      console.warn(
        `[gemini-embedding] Rate limited. Retrying in ${Math.ceil(
          retryDelayMs / 1000,
        )}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );

      await new Promise((resolve) =>
        setTimeout(resolve, retryDelayMs),
      );
    }
  }

  throw new Error("Retry operation exited unexpectedly");
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";

  readonly model: string;
  readonly dimensions: number;

  private readonly client: GoogleGenAI;

  constructor(config: GeminiEmbeddingConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model;
    this.dimensions = config.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.client.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: this.dimensions,
      },
    });

    const values = result.embeddings?.[0]?.values;

    if (!values) {
      throw new Error("Gemini returned no embedding");
    }

    return normalizeEmbedding(values);
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const result = await withRetry(() =>
      this.client.models.embedContent({
        model: this.model,
        contents: texts,
        config: {
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: this.dimensions,
        },
      }),
    );

    const embeddings = result.embeddings ?? [];

    if (embeddings.length !== texts.length) {
      throw new Error(
        `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`,
      );
    }

    return embeddings.map((embedding) => {
      if (!embedding.values) {
        throw new Error("Gemini returned an embedding without values");
      }

      return normalizeEmbedding(embedding.values);
    });
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await withRetry(() =>
      this.client.models.embedContent({
        model: this.model,
        contents: text,
        config: {
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: this.dimensions,
        },
      }),
    );

    const values = result.embeddings?.[0]?.values;

    if (!values) {
      throw new Error("Gemini returned no query embedding");
    }

    return normalizeEmbedding(values);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embedMany(texts);
  }
}
