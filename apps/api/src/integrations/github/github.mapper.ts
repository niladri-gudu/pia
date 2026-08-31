import type { NormalizedDocument } from "@project-intelligence/types";

import type { GithubCommit, GithubIssue, GithubPullRequest } from "./github.types";

export function mapIssueToDocument(issue: GithubIssue): NormalizedDocument {
  return {
    sourceType: "GITHUB",

    sourceId: String(issue.id),

    documentType: issue.pull_request ? "PULL_REQUEST" : "ISSUE",

    title: issue.title,

    content: issue.body ?? "",

    url: issue.html_url,

    author: issue.user?.login,

    occurredAt: new Date(issue.created_at),

    metadata: {
      number: issue.number,
      state: issue.state,
      updatedAt: issue.updated_at,
    },
  };
}

export function mapPullRequestToDocument(pullRequest: GithubPullRequest): NormalizedDocument {
  return {
    sourceType: "GITHUB",

    sourceId: String(pullRequest.id),

    documentType: "PULL_REQUEST",

    title: pullRequest.title,

    content: pullRequest.body ?? "",

    url: pullRequest.html_url,

    author: pullRequest.user?.login,

    occurredAt: new Date(pullRequest.created_at),

    metadata: {
      number: pullRequest.number,
      state: pullRequest.state,
      mergedAt: pullRequest.merged_at,
      updatedAt: pullRequest.updated_at,
    },
  };
}

export function mapCommitToDocument(commit: GithubCommit): NormalizedDocument {
  const occurredAt = commit.commit.author?.date ? new Date(commit.commit.author.date) : undefined;

  return {
    sourceType: "GITHUB",
    sourceId: commit.sha,
    documentType: "COMMIT",
    title: commit.commit.message.split("\n")[0] ?? commit.sha,
    content: commit.commit.message,
    url: commit.html_url,
    ...(commit.author?.login ? { author: commit.author.login } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    metadata: {
      sha: commit.sha,
      authorEmail: commit.commit.author?.email,
    },
  };
}
