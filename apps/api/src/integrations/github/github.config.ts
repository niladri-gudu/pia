import { env } from "../../config/env";

export function getGithubToken(): string {
  return env.GITHUB_TOKEN;
}
