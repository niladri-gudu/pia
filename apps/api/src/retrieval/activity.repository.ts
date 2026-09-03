import prisma, {
  Prisma,
  type DocumentSourceType,
  type DocumentType,
} from "@project-intelligence/database";
import type { ActivityRetrievalOptions, ProjectActivity } from "./activity.types";

interface ProjectActivityRow {
  id: string;
  sourceId: string;
  documentType: DocumentType;
  sourceType: DocumentSourceType;
  title: string;
  content: string;
  url: string | null;
  author: string | null;
  occurredAt: Date;
  metadata: unknown;
}

export async function searchProjectActivity(
  options: ActivityRetrievalOptions,
): Promise<ProjectActivity[]> {
  if (options.from >= options.to) {
    throw new Error("Activity retrieval 'from' must be before 'to'");
  }

  const limit = options.limit ?? 50;

  if (limit <= 0) {
    throw new Error("Activity retrieval limit must be greater than zero");
  }

  const documentTypeFilter =
    options.documentTypes && options.documentTypes.length > 0 ? options.documentTypes : undefined;

  const dateField = options.dateField ?? "occurredAt";

  const rows =
    dateField === "mergedAt"
      ? await prisma.$queryRaw<ProjectActivityRow[]>`
          SELECT
            d."id",
            d."sourceId",
            d."documentType",
            d."sourceType",
            d."title",
            d."content",
            d."url",
            d."author",
            d."occurredAt",
            d."metadata"
          FROM "Document" d
          WHERE d."projectId" = ${options.projectId}
            AND d."documentType" = 'PULL_REQUEST'::"DocumentType"
            AND d."metadata"->>'mergedAt' IS NOT NULL
            AND (d."metadata"->>'mergedAt')::timestamptz >= ${options.from}
            AND (d."metadata"->>'mergedAt')::timestamptz < ${options.to}
            ORDER BY (d."metadata"->>'mergedAt')::timestamptz DESC
            LIMIT ${limit}
        `
      : await prisma.$queryRaw<ProjectActivityRow[]>`
          SELECT
            d."id",
            d."sourceId",
            d."documentType",
            d."sourceType",
            d."title",
            d."content",
            d."url",
            d."author",
            d."occurredAt",
            d."metadata"
          FROM "Document" d
          WHERE d."projectId" = ${options.projectId}
            AND d."occurredAt" >= ${options.from}
            AND d."occurredAt" < ${options.to}
            ${
              documentTypeFilter
                ? Prisma.sql`AND d."documentType" IN (${Prisma.join(documentTypeFilter)})`
                : Prisma.empty
            }
          ORDER BY d."occurredAt" DESC
          LIMIT ${limit}
        `;

  return rows.map((row) => ({
    id: row.id,
    sourceId: row.sourceId,
    documentType: row.documentType,
    sourceType: row.sourceType,
    title: row.title,
    content: row.content,
    ...(row.url ? { url: row.url } : {}),
    ...(row.author ? { author: row.author } : {}),
    occurredAt: row.occurredAt,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
  }));
}
