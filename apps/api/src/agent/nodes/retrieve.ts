import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { VectorRetriever } from "../../retrieval/retriever";
import { retrieveActivity } from "./retrieve-activity";
import type { RetrievedChunk } from "../../retrieval/types";
import type { AgentState, RetrievedEvidence } from "../state";
import { resolveTemporalRange } from "../../retrieval/temporal";

export async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  const embeddingProvider = createEmbeddingProvider();
  const retriever = new VectorRetriever(embeddingProvider);

  const plans =
    state.subQuestions.length > 0
      ? state.subQuestions
      : [
          {
            question: state.query,
            strategy: "semantic" as const,
          },
        ];

  const results = await Promise.all(
    plans.map(async (plan): Promise<RetrievedEvidence> => {
      const chunks: RetrievedChunk[] = [];

      if (plan.strategy === "semantic" || plan.strategy === "hybrid") {
        const semanticChunks = await retriever.retrieve(plan.semanticQuery ?? plan.question, {
          projectId: state.projectId,
          topK: 5,
        });

        chunks.push(...semanticChunks);
      }

      if (plan.strategy === "activity" || plan.strategy === "hybrid") {
        const constraints = plan.activityConstraints;

        if (!constraints) {
          if (plan.strategy === "activity") {
            throw new Error(
              `Activity retrieval plan is missing activityConstraints: ${plan.question}`,
            );
          }
        } else {
          const dateField = constraints.dateField ?? "occurredAt";

          let from: Date;
          let to: Date;

          if (constraints.temporalRange) {
            ({ from, to } = resolveTemporalRange(constraints.temporalRange));
          } else {
            const range = constraints[dateField];

            if (!range) {
              throw new Error(
                `Activity retrieval plan is missing a temporal range: ${plan.question}`,
              );
            }

            from = new Date(range.gte);
            to = new Date(range.lte);
          }

          const activities = await retrieveActivity(state.projectId, {
            from,
            to,
            dateField,
            exhaustive: constraints.exhaustive,
          });

          // Temporary compatibility adapter:
          // activity results will eventually have their own evidence representation.
          chunks.push(
            ...activities.map((activity) => ({
              id: activity.id,
              documentId: activity.id,
              content: activity.content,
              chunkIndex: 0,
              title: activity.title,
              url: activity.url,
              similarity: 1,
              activityAt: activity.activityAt,
              activityDateField: activity.activityDateField,
            })),
          );
        }
      }

      return {
        subQuestion: plan.question,
        chunks,
      };
    }),
  );

  const retrievedChunks: RetrievedChunk[] = [];
  const seenChunks = new Set<string>();

  for (const result of results) {
    for (const chunk of result.chunks) {
      if (seenChunks.has(chunk.id)) continue;

      seenChunks.add(chunk.id);
      retrievedChunks.push(chunk);
    }
  }

  console.log(
    `[agent] Retrieved ${retrievedChunks.length} unique chunks from ${plans.length} plans`,
  );

  return {
    retrievedChunks,
    evidence: results,
  };
}
