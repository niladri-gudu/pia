import { createLLMFromEnv } from "@project-intelligence/ai";
import { env } from "../config/env.js";

async function main(): Promise<void> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const response = await llm.invoke("Reply with exactly: PIA LLM connection works.");

  console.log(response.content);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
