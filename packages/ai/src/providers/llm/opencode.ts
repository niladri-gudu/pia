import { ChatOpenAI } from "@langchain/openai";
import type { LLM, LLMProvider, LLMProviderConfig } from "./types.js";

const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";

export class OpenCodeGoProvider implements LLMProvider {
  readonly name = "opencode";

  createModel(config: LLMProviderConfig): LLM {
    if (!config.model.trim()) {
      throw new Error("LLM model cannot be empty.");
    }

    const apiKey = config.options?.apiKey;

    if (typeof apiKey !== "string" || !apiKey.trim()) {
      throw new Error("OpenCode Go API key is required in the LLM provider configuration.");
    }

    return new ChatOpenAI({
      model: config.model,
      apiKey,
      configuration: {
        baseURL: OPENCODE_GO_BASE_URL,
      },
    });
  }
}
