import type { NormalizedDocument } from "@project-intelligence/types";

import { GithubClient } from "./github.client";

import { mapCommitToDocument, mapIssueToDocument, mapPullRequestToDocument } from "./github.mapper";

import { saveGithubDocuments } from "./github.repository";

export interface GithubSyncResult {
  documents: NormalizedDocument[];

  created: number;
  updated: number;
}

interface SyncRepositoryInput {
  owner: string;
  repository: string;

  workspaceId: string;
  projectId: string;
}

export class GithubService {
  constructor(private readonly client: GithubClient) {}

  async syncRepository({
    owner,
    repository,
    workspaceId,
    projectId,
  }: SyncRepositoryInput): Promise<GithubSyncResult> {
    const [issues, pullRequests, commits] = await Promise.all([
      this.client.getIssues(owner, repository),
      this.client.getPullRequests(owner, repository),
      this.client.getCommits(owner, repository),
    ]);

    const documents: NormalizedDocument[] = [];

    for (const issue of issues) {
      if (issue.pull_request) {
        continue;
      }

      documents.push(mapIssueToDocument(issue));
    }

    for (const pullRequest of pullRequests) {
      documents.push(mapPullRequestToDocument(pullRequest));
    }

    for (const commit of commits) {
      documents.push(mapCommitToDocument(commit));
    }

    const result = await saveGithubDocuments({
      workspaceId,
      projectId,
      documents,
    });

    return {
      documents,

      created: result.created,
      updated: result.updated,
    };
  }
}
