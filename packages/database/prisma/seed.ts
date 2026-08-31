import {
  PrismaClient,
  ConnectionProvider,
  ConnectionStatus,
  DocumentSourceType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const workspace = await prisma.workspace.upsert({
    where: {
      id: "pia-dev-workspace",
    },

    update: {},

    create: {
      id: "pia-dev-workspace",
      name: "PIA Development Workspace",
    },
  });

  const connection = await prisma.connection.upsert({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: workspace.id,
        provider: ConnectionProvider.GITHUB,
        externalId: "github-development",
      },
    },

    update: {
      status: ConnectionStatus.ACTIVE,
    },

    create: {
      workspaceId: workspace.id,
      provider: ConnectionProvider.GITHUB,
      externalId: "github-development",
      status: ConnectionStatus.ACTIVE,
    },
  });

  const project = await prisma.project.upsert({
    where: {
      connectionId_externalId: {
        connectionId: connection.id,
        externalId: "facebook/react",
      },
    },

    update: {
      name: "React",
      sourceUrl: "https://github.com/facebook/react",
    },

    create: {
      workspaceId: workspace.id,
      connectionId: connection.id,

      name: "React",

      externalId: "facebook/react",

      sourceType: DocumentSourceType.GITHUB,

      sourceUrl: "https://github.com/facebook/react",
    },
  });

  console.log("✅ Workspace:", workspace.id);
  console.log("✅ Connection:", connection.id);
  console.log("✅ Project:", project.id);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
