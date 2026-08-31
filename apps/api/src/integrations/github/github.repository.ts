import { prisma, type Prisma } from "@project-intelligence/database";
import type { NormalizedDocument } from "@project-intelligence/types";

function toPrismaJson(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

interface SaveDocumentsInput {
  workspaceId: string;
  projectId: string;
  documents: NormalizedDocument[];
}

export interface SaveDocumentsResult {
  created: number;
  updated: number;
}

export async function saveGithubDocuments({
  workspaceId,
  projectId,
  documents,
}: SaveDocumentsInput): Promise<SaveDocumentsResult> {
  let created = 0;
  let updated = 0;

  for (const document of documents) {
    const existing = await prisma.document.findUnique({
      where: {
        sourceType_sourceId_documentType: {
          sourceType: document.sourceType,
          sourceId: document.sourceId,
          documentType: document.documentType,
        },
      },
    });

    await prisma.document.upsert({
      where: {
        sourceType_sourceId_documentType: {
          sourceType: document.sourceType,
          sourceId: document.sourceId,
          documentType: document.documentType,
        },
      },

      create: {
        workspaceId,
        projectId,

        sourceType: document.sourceType,
        sourceId: document.sourceId,
        documentType: document.documentType,

        title: document.title,
        content: document.content,
        url: document.url,

        author: document.author,
        occurredAt: document.occurredAt,

        metadata: toPrismaJson(document.metadata),
      },

      update: {
        title: document.title,
        content: document.content,
        url: document.url,

        author: document.author,
        occurredAt: document.occurredAt,

        metadata: toPrismaJson(document.metadata),

        projectId,
        workspaceId,
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  return {
    created,
    updated,
  };
}
