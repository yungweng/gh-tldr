import { execa } from "execa";
import type {
  GitHubActivity,
  PullRequest,
  Issue,
  Commit,
  RepoInfo,
} from "./types.js";

function getSinceDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

async function ghApi<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const args = [
    "api",
    "-X",
    "GET",
    endpoint,
    ...Object.entries(params).flatMap(([key, value]) => ["-f", `${key}=${value}`]),
  ];

  const { stdout } = await execa("gh", args);
  return JSON.parse(stdout) as T;
}

interface SearchResult<T> {
  items: T[];
}

interface RawPR {
  repository_url: string;
  title: string;
  number: number;
  state: string;
  html_url: string;
}

interface RawCommit {
  repository: {
    name: string;
    owner: { login: string };
  };
  commit: { message: string };
  html_url: string;
}

function parsePR(item: RawPR): PullRequest {
  const urlParts = item.repository_url.split("/");
  return {
    repo: urlParts[urlParts.length - 1],
    org: urlParts[urlParts.length - 2],
    title: item.title,
    number: item.number,
    state: item.state,
    url: item.html_url,
  };
}

function parseIssue(item: RawPR): Issue {
  const urlParts = item.repository_url.split("/");
  return {
    repo: urlParts[urlParts.length - 1],
    org: urlParts[urlParts.length - 2],
    title: item.title,
    number: item.number,
    url: item.html_url,
  };
}

function parseCommit(item: RawCommit): Commit {
  return {
    repo: item.repository.name,
    org: item.repository.owner.login,
    message: item.commit.message.split("\n")[0],
    url: item.html_url,
  };
}

export async function getAuthenticatedUser(): Promise<string> {
  const { stdout } = await execa("gh", ["api", "user", "--jq", ".login"]);
  return stdout.trim();
}

export async function fetchGitHubActivity(
  username: string,
  days: number,
  publicOnly: boolean
): Promise<GitHubActivity> {
  const since = getSinceDate(days);
  const today = formatDate(new Date());
  const visibilityFilter = publicOnly ? " is:public" : "";

  // Fetch all data in parallel
  const [
    prsCreatedResult,
    prsMergedResult,
    prsReviewedResult,
    issuesCreatedResult,
    issuesClosedResult,
    commitsResult,
  ] = await Promise.all([
    ghApi<SearchResult<RawPR>>("search/issues", {
      q: `author:${username} type:pr created:>=${since}${visibilityFilter}`,
      per_page: "100",
    }),
    ghApi<SearchResult<RawPR>>("search/issues", {
      q: `author:${username} type:pr merged:>=${since}${visibilityFilter}`,
      per_page: "100",
    }),
    ghApi<SearchResult<RawPR>>("search/issues", {
      q: `reviewed-by:${username} type:pr updated:>=${since} -author:${username}${visibilityFilter}`,
      per_page: "100",
    }),
    ghApi<SearchResult<RawPR>>("search/issues", {
      q: `author:${username} type:issue created:>=${since}${visibilityFilter}`,
      per_page: "100",
    }),
    ghApi<SearchResult<RawPR>>("search/issues", {
      q: `involves:${username} type:issue closed:>=${since}${visibilityFilter}`,
      per_page: "100",
    }),
    ghApi<SearchResult<RawCommit>>("search/commits", {
      q: `author:${username} committer-date:>=${since}`,
      per_page: "100",
    }),
  ]);

  const prs_created = prsCreatedResult.items.map(parsePR);
  const prs_merged = prsMergedResult.items.map(parsePR);
  const prs_reviewed = prsReviewedResult.items.map(parsePR);
  const issues_created = issuesCreatedResult.items.map(parseIssue);
  const issues_closed = issuesClosedResult.items.map(parseIssue);
  const commits = commitsResult.items.map(parseCommit);

  // Extract new repos from commits with initial/init/first in message
  const repos_created: RepoInfo[] = commits
    .filter((c) => /initial|^init |first commit/i.test(c.message))
    .map((c) => ({ name: c.repo, org: c.org }))
    .filter(
      (repo, index, self) =>
        self.findIndex((r) => r.name === repo.name && r.org === repo.org) ===
        index
    );

  // Extract unique repos touched
  const allRepos = [
    ...prs_created,
    ...prs_merged,
    ...prs_reviewed,
    ...issues_created,
    ...issues_closed,
    ...commits,
  ].map((item) => `${item.org}/${item.repo}`);

  const repos_touched = [...new Set(allRepos)];

  const periodText =
    days === 1
      ? "last 24 hours"
      : days === 7
        ? "last 7 days"
        : days === 30
          ? "last 30 days"
          : `last ${days} days`;

  return {
    user: username,
    date: today,
    period: periodText,
    prs_created,
    prs_merged,
    prs_reviewed,
    issues_created,
    issues_closed,
    commits,
    repos_created,
    repos_touched,
  };
}
