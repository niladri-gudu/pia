import { createLLMFromEnv } from "@project-intelligence/ai";
import { env } from "../../config/env";
import type { AgentState, RetrievalPlan } from "../state";

const SYSTEM_PROMPT = `You are the planning component of Project Intelligence Agent.

Your job is to break the user's question into focused retrieval tasks and decide how each task should be retrieved.

Available retrieval strategies:

- "semantic": Use vector search when the question requires understanding technical concepts, code behavior, architecture, implementation details, bugs, or explanations.
- "activity": Use structured project activity search when the question asks what happened, when something happened, recent changes, commits, issues, pull requests, or project activity within a time period.
- "hybrid": Use both semantic and activity retrieval when the question requires identifying time-bounded project activity and then understanding the technical meaning or impact of that activity.

For activity retrieval:

- Use "activity_constraints" when the question contains a time constraint.
- "activity_constraints" may contain:
  - "dateField": "occurredAt" for general project activity.
  - "dateField": "mergedAt" for pull requests that were merged during a period.
  - "temporalRange" for relative time expressions.
  - "exhaustive": true when complete activity coverage is required.
- Supported temporalRange values:
  - "today"
  - "yesterday"
  - "this_week"
  - "last_week"
  - "this_month"
  - "last_month"
  - "this_quarter"
  - "last_quarter"
  - "this_year"
  - "last_year"
  - "custom"
- For "this quarter", use "this_quarter".
- For "last quarter", use "last_quarter".
- For "this month", use "this_month".
- For "last month", use "last_month".
- For "custom", provide the explicit "gte" and "lte" timestamps.
- Do not calculate dates yourself for relative time expressions.
- Do not invent a temporal constraint when the user did not provide one.
- Use "semantic_query" for the semantic portion of a hybrid retrieval plan.
- Use "exhaustive": true when the user asks for all, every, complete, comprehensive, or a summary of activity within a time period.
- Use "exhaustive": false or omit it when only a limited set of relevant or recent activities is needed.

Rules:
- Return 1-5 retrieval plans.
- Every retrieval plan MUST contain:
  - "question": a non-empty string describing the retrieval task.
  - "strategy": one of "semantic", "activity", or "hybrid".
- For activity or hybrid plans, include "activity_constraints" when a time constraint is present.
- For hybrid plans, include "semantic_query".
- Preserve the user's intent.
- Keep each question focused enough for retrieval.
- Do not answer the user's question.
- Return valid JSON only.

Required output shape:

[
  {
    "question": "A focused retrieval question",
    "strategy": "activity",
    "activity_constraints": {
      "dateField": "occurredAt",
      "temporalRange": "last_month",
      "exhaustive": true
    }
  }
]`;

function parsePlans(content: string): RetrievalPlan[] {
  const parsed: unknown = JSON.parse(content);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Decomposition result must be an object");
  }

  let plans: unknown[];

  if (Array.isArray(parsed)) {
    plans = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).retrieval_plans)
  ) {
    plans = (parsed as Record<string, unknown>).retrieval_plans as unknown[];
  } else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).plans)
  ) {
    plans = (parsed as Record<string, unknown>).plans as unknown[];
  } else {
    throw new Error(
      "Decomposition result must be an array or contain a plans/retrieval_plans array",
    );
  }

  if (!plans) {
    throw new Error(
      "Decomposition result must be an array or contain a plans/retrieval_plans array",
    );
  }

  return plans.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Retrieval plan ${index} must be an object`);
    }

    const plan = item as Record<string, unknown>;

    const strategy = plan.strategy ?? plan.retrieval_strategy;

    if (strategy !== "semantic" && strategy !== "activity" && strategy !== "hybrid") {
      throw new Error(`Retrieval plan ${index} has an invalid strategy`);
    }

    const question =
      typeof plan.question === "string"
        ? plan.question.trim()
        : typeof plan.task === "string"
          ? plan.task.trim()
          : typeof plan.description === "string"
            ? plan.description.trim()
            : typeof plan.query === "string"
              ? plan.query.trim()
              : typeof plan.semantic_query === "string"
                ? plan.semantic_query.trim()
                : strategy === "activity" || strategy === "hybrid"
                  ? "Project activity during the specified time period"
                  : undefined;

    if (!question || !question.trim()) {
      throw new Error(`Retrieval plan ${index} has an invalid question`);
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
        throw new Error(`Retrieval plan ${index} has an invalid activity dateField`);
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
        throw new Error(`Retrieval plan ${index} has an invalid temporalRange`);
      }

      if (constraints.exhaustive !== undefined && typeof constraints.exhaustive !== "boolean") {
        throw new Error(`Retrieval plan ${index} has an invalid exhaustive value`);
      }
    }

    const semanticQuery =
      typeof plan.semantic_query === "string" && plan.semantic_query.trim()
        ? plan.semantic_query
        : undefined;

    return {
      question,
      strategy,
      ...(activityConstraints
        ? {
            activityConstraints: activityConstraints as RetrievalPlan["activityConstraints"],
          }
        : {}),
      ...(semanticQuery ? { semanticQuery } : {}),
    };
  });
}

export async function decomposeNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const prompt = `${SYSTEM_PROMPT}

USER QUESTION:

${state.query}`;

  const response = await llm.invoke(prompt);

  const content =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  console.log("\n[agent] Raw decomposition response:");
  console.log(content);
  console.log();

  const plans = parsePlans(content);

  if (plans.length === 0 || plans.length > 5) {
    throw new Error("Decomposition must return between 1 and 5 plans");
  }

  console.log(
    `[agent] Created ${plans.length} retrieval plans: ${plans
      .map((plan) => plan.strategy)
      .join(", ")}`,
  );

  return {
    subQuestions: plans,
  };
}
