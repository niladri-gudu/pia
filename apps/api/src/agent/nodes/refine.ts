import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState, RetrievalPlan } from "../state";
import { env } from "../../config/env";

const SYSTEM_PROMPT = `You are the retrieval refinement component of Project Intelligence Agent.

Your job is to create targeted retrieval plans that can find evidence missing from the current project context.

Available retrieval strategies:

- "semantic": Use vector search for technical concepts, code behavior, architecture, implementation details, bugs, or explanations.
- "activity": Use structured project activity search for commits, issues, pull requests, project activity, or time-bounded activity.
- "hybrid": Use both activity and semantic retrieval when evidence requires both a time-bounded project activity scope and technical interpretation.

For activity retrieval:
- Use "activity_constraints" when the missing evidence has a time constraint.
- "dateField" must be either "occurredAt" or "mergedAt".
- Use "mergedAt" specifically when the missing evidence concerns pull requests merged during a period.
- Use "temporalRange" for relative time expressions such as "this_quarter", "last_month", etc.
- Do not calculate dates yourself.
- Preserve the temporal intent from the original question or existing retrieval plans.
- Use "semantic_query" for the semantic portion of a hybrid plan.
- Use "exhaustive": true when the missing evidence requires a complete or comprehensive set of activities within a time period.
- Use "exhaustive": false or omit it when a limited set of relevant activities is sufficient.

Rules:
- Use the original user question as the overall goal.
- Use the existing retrieval plans and missing evidence to guide refinement.
- Each refined plan should target a specific missing piece of evidence.
- Prefer concrete project artifacts such as commits, pull requests, issues, documents, dates, risks, blockers, or changes when appropriate.
- Do not answer the user's question.
- Do not invent project-specific facts.
- Avoid repeating existing retrieval plans unless the missing evidence requires a more specific version.
- Return ONLY valid JSON.
- Return between 1 and 5 retrieval plans.

Return this structure:

[
  {
    "strategy": "activity | semantic | hybrid",
    "query": "focused retrieval task",
    "activity_constraints": {
      "dateField": "occurredAt | mergedAt",
      "temporalRange": "this_quarter | last_quarter | this_month | last_month | this_week | last_week | today | yesterday | this_year | last_year | custom"
      "exhaustive": true | false
    },
    "semantic_query": "optional semantic search query"
  }
]

For activity or hybrid plans, preserve the relevant temporal constraints from the original plans when the missing evidence is time-bounded.
`;

function parseRefinedPlans(content: string): RetrievalPlan[] {
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error("LLM refinement response must be an array.");
  }

  const plans: RetrievalPlan[] = parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Refined plan ${index} must be an object.`);
    }

    const plan = item as Record<string, unknown>;

    const question =
      typeof plan.question === "string"
        ? plan.question
        : typeof plan.query === "string"
          ? plan.query
          : typeof plan.description === "string"
            ? plan.description
            : typeof plan.semantic_query === "string"
              ? plan.semantic_query
              : plan.strategy === "activity" || plan.strategy === "hybrid"
                ? "Project activity during the specified time period"
                : undefined;

    if (!question || !question.trim()) {
      throw new Error(`Refined plan ${index} has an invalid question.`);
    }

    const strategy = plan.strategy;

    if (strategy !== "semantic" && strategy !== "activity" && strategy !== "hybrid") {
      throw new Error(`Refined plan ${index} has an invalid strategy.`);
    }

    const activityConstraints =
      plan.activity_constraints && typeof plan.activity_constraints === "object"
        ? plan.activity_constraints
        : undefined;

    if (activityConstraints) {
      const constraints = activityConstraints as Record<string, unknown>;

      if (
        constraints.dateField !== undefined &&
        constraints.dateField !== "occurredAt" &&
        constraints.dateField !== "mergedAt"
      ) {
        throw new Error(`Refined plan ${index} has an invalid activity dateField.`);
      }

      if (
        constraints.temporalRange !== undefined &&
        ![
          "today",
          "yesterday",
          "this_week",
          "last_week",
          "this_month",
          "last_month",
          "this_quarter",
          "last_quarter",
          "this_year",
          "last_year",
          "custom",
        ].includes(constraints.temporalRange as string)
      ) {
        throw new Error(`Refined plan ${index} has an invalid temporalRange.`);
      }

      if (constraints.exhaustive !== undefined && typeof constraints.exhaustive !== "boolean") {
        throw new Error(`Refined plan ${index} has an invalid exhaustive value.`);
      }
    }

    const semanticQuery =
      typeof plan.semantic_query === "string" && plan.semantic_query.trim()
        ? plan.semantic_query
        : undefined;

    return {
      question: question.trim(),
      strategy,
      ...(activityConstraints
        ? {
            activityConstraints: activityConstraints as RetrievalPlan["activityConstraints"],
          }
        : {}),
      ...(semanticQuery
        ? {
            semanticQuery,
          }
        : {}),
    };
  });

  if (plans.length === 0) {
    throw new Error("LLM refinement returned no plans.");
  }

  return plans.slice(0, 5);
}

export async function refineNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const prompt = `${SYSTEM_PROMPT}

ORIGINAL USER QUESTION:

${state.query}

EXISTING RETRIEVAL PLANS:

${JSON.stringify(state.subQuestions, null, 2)}

MISSING EVIDENCE:

${state.missingEvidence.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Create targeted retrieval questions for the missing evidence.`;

  const response = await llm.invoke(prompt);

  const content =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const refinedPlans = parseRefinedPlans(content);

  console.log(
    `[agent] Generated ${refinedPlans.length} refined retrieval plans: ${refinedPlans
      .map((plan) => plan.strategy)
      .join(", ")}`,
  );

  return {
    subQuestions: refinedPlans,
    retrievalIteration: state.retrievalIteration + 1,
  };
}
