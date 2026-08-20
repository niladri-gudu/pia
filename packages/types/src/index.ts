import { z } from "zod";

/**
 * Shared, framework-agnostic types and schemas.
 *
 * NOTE: This is the foundation of the shared type surface. As product features
 * are implemented (GitHub/Jira sync, RAG, agents, memory, etc.) the domain
 * types will be expanded here so the web, api and AI packages all agree.
 */

// --- Generic API envelope -----------------------------------------------------

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// --- Future domain placeholders -----------------------------------------------
// Intentionally empty for now. These will be expanded in later phases.
// - User, Workspace, Connection, Project, Document, DocumentChunk
// - Conversation, Message, Memory, Evidence
// - AgentRun, ToolCall, Citation, SyncJob
