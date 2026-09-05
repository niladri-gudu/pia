import { loadEnv } from "@project-intelligence/config";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1).default("postgresql://pia:pia@localhost:5432/pia"),

  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  LLM_PROVIDER: z.enum(["opencode"]).default("opencode"),
  LLM_MODEL: z.string().default("deepseek-v4-flash"),
  OPENCODE_API_KEY: z.string().min(1),

  LANGSMITH_TRACING: z.enum(["true", "false"]).default("false"),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().default("project-intelligence-agent"),
  LANGSMITH_ENDPOINT: z.string().optional(),

  GITHUB_TOKEN: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  EMBEDDING_PROVIDER: z.enum(["gemini"]).default("gemini"),

  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),

  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See logs above.");
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
