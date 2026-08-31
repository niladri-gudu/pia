import type {
  GithubCommit,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
} from "./github.types";

const GITHUB_API_URL = "https://api.github.com";

export class GithubClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${GITHUB_API_URL}${path}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(`GitHub API request failed with status ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async getRepository(owner: string, repository: string): Promise<GithubRepository> {
    return this.request(`/repos/${owner}/${repository}`);
  }

  async getIssues(owner: string, repository: string): Promise<GithubIssue[]> {
    return this.request(`/repos/${owner}/${repository}/issues?state=all&per_page=100`);
  }

  async getPullRequests(owner: string, repository: string): Promise<GithubPullRequest[]> {
    return this.request(`/repos/${owner}/${repository}/pulls?state=all&per_page=100`);
  }

  async getCommits(owner: string, repository: string): Promise<GithubCommit[]> {
    return this.request(`/repos/${owner}/${repository}/commits?per_page=100`);
  }
}
