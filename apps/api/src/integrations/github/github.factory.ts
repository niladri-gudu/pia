import { GithubClient } from "./github.client";
import { getGithubToken } from "./github.config";

export function createGithubClient(): GithubClient {
  return new GithubClient(getGithubToken());
}
