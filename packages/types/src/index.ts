import { z } from "zod"

export const connectionProviderSchema = z.enum([
  "GITHUB",
  "JIRA"
])

export const connectionStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ERROR",
])

export const documentSourceTypeSchema  = z.enum([
  "GITHUB",
  "JIRA",
])

export const documentTypeSchema = z.object([
  "ISSUE",
  "PULL_REQUEST",
  "COMMIT",
  "COMMENT",
])

export const syncStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
])

export type ConnectionProvider = z.infer<
  typeof connectionProviderSchema
>;

export type ConnectionStatus = z.infer<
  typeof connectionStatusSchema
>;

export type DocumentSourceType = z.infer<
  typeof documentSourceTypeSchema
>;

export type DocumentType = z.infer<
  typeof documentTypeSchema
>;

export type SyncStatus = z.infer<
  typeof syncStatusSchema
>;

export interface NormalizedDocument {
  sourceType: DocumentSourceType;
  sourceId: string;
  documentType: DocumentType;

  title: string;
  content: string;
  url?: string;

  author?: string;
  occurredAt?: Date;

  metadata?: Record<string, unknown>;
}

export interface SyncResult {
  recordsProcessed: number;
  documentsCreated: number;
  documentsUpdated: number;
}