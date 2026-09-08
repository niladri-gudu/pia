import { z } from "zod";

/**
 * Types of persistent project memories the agent can extract.
 */
export const memoryTypeSchema = z.enum(["FACT", "PREFERENCE", "DECISION", "CONTEXT"]);

/**
 * A single memory candidate extracted from a conversation.
 */
export const extractedMemorySchema = z.object({
  type: memoryTypeSchema,
  content: z.string().min(1),
});

/**
 * Structured response returned by the memory extraction model.
 *
 * An empty array means the conversation contains nothing
 * useful enough to persist as project memory.
 */
export const memoryExtractionSchema = z.object({
  memories: z.array(extractedMemorySchema),
});

export type ExtractedMemory = z.infer<typeof extractedMemorySchema>;

export type MemoryExtractionResult = z.infer<typeof memoryExtractionSchema>;
