export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  owner: {
    login: string;
  };
}

export interface GithubUser {
  login: string;
}

export interface GithubIssue {
  id: number;
  number: number;
  title: string;

  body: string | null;

  html_url: string;

  state: string;

  user: GithubUser | null;

  created_at: string;
  updated_at: string;

  pull_request?: {
    url: string;
    html_url: string;
  };
}

export interface GithubPullRequest {
  id: number;
  number: number;

  title: string;
  body: string | null;

  html_url: string;

  state: string;

  user: GithubUser | null;

  created_at: string;
  updated_at: string;

  merged_at: string | null;
}

export interface GithubCommit {
  sha: string;

  html_url: string;

  message: string;

  author: GithubUser | null;

  commit: {
    message: string;

    author: {
      name: string;
      email: string;
      date: string;
    } | null;

    committer: {
      name: string;
      email: string;
      date: string;
    } | null;
  };
}
