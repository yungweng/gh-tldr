import { execa } from "execa";
import type {
	CodeStats,
	Commit,
	GitHubActivity,
	Issue,
	PullRequest,
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
	params: Record<string, string>,
): Promise<T> {
	const args = [
		"api",
		"-X",
		"GET",
		endpoint,
		...Object.entries(params).flatMap(([key, value]) => [
			"-f",
			`${key}=${value}`,
		]),
	];

	const { stdout } = await execa("gh", args);
	return JSON.parse(stdout) as T;
}

async function ghApiPaginated<T>(
	endpoint: string,
	params: Record<string, string>,
	maxPages: number = 10,
): Promise<T[]> {
	const allItems: T[] = [];
	let page = 1;

	while (page <= maxPages) {
		const result = await ghApi<SearchResult<T>>(endpoint, {
			...params,
			page: String(page),
			per_page: "100",
		});

		allItems.push(...result.items);

		if (result.items.length < 100) {
			break;
		}
		page++;
	}

	return allItems;
}

interface SearchResult<T> {
	total_count?: number;
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
	commit: {
		message: string;
		author: { date: string };
	};
	html_url: string;
}

interface RawRepo {
	name: string;
	owner: { login: string };
	created_at: string;
	html_url: string;
}

interface RawPRDetails {
	additions: number;
	deletions: number;
	changed_files: number;
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
		date: item.commit.author.date,
	};
}

async function fetchPRDetails(
	org: string,
	repo: string,
	number: number,
): Promise<{ additions: number; deletions: number; changedFiles: number }> {
	const { stdout } = await execa("gh", [
		"api",
		`repos/${org}/${repo}/pulls/${number}`,
	]);
	const data = JSON.parse(stdout) as RawPRDetails;
	return {
		additions: data.additions,
		deletions: data.deletions,
		changedFiles: data.changed_files,
	};
}

async function enrichPRsWithStats(prs: PullRequest[]): Promise<PullRequest[]> {
	const results = await Promise.allSettled(
		prs.map(async (pr) => {
			const stats = await fetchPRDetails(pr.org, pr.repo, pr.number);
			return { ...pr, ...stats };
		}),
	);

	return results.map((result, index) => {
		if (result.status === "fulfilled") {
			return result.value;
		}
		// On failure, return original PR without stats
		return prs[index];
	});
}

function calculateStats(prs: PullRequest[]): CodeStats {
	// Deduplicate PRs by org/repo/number to avoid double-counting
	const seen = new Set<string>();
	const uniquePRs = prs.filter((pr) => {
		const key = `${pr.org}/${pr.repo}#${pr.number}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	const totalAdditions = uniquePRs.reduce(
		(sum, pr) => sum + (pr.additions ?? 0),
		0,
	);
	const totalDeletions = uniquePRs.reduce(
		(sum, pr) => sum + (pr.deletions ?? 0),
		0,
	);
	const totalChangedFiles = uniquePRs.reduce(
		(sum, pr) => sum + (pr.changedFiles ?? 0),
		0,
	);

	return {
		totalAdditions,
		totalDeletions,
		totalChangedFiles,
		netLines: totalAdditions - totalDeletions,
	};
}

export async function getAuthenticatedUser(): Promise<string> {
	const { stdout } = await execa("gh", ["api", "user", "--jq", ".login"]);
	return stdout.trim();
}

export async function fetchUserOrgs(username: string): Promise<string[]> {
	// First try authenticated user's orgs (includes private memberships)
	try {
		const authUser = await getAuthenticatedUser();
		if (authUser === username) {
			const { stdout } = await execa("gh", [
				"api",
				"user/orgs",
				"--jq",
				".[].login",
			]);
			return stdout.trim().split("\n").filter(Boolean);
		}
	} catch {
		// Fall through to public orgs
	}

	// Fallback to public orgs for other users
	try {
		const { stdout } = await execa("gh", [
			"api",
			`users/${username}/orgs`,
			"--jq",
			".[].login",
		]);
		return stdout.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

async function fetchReposCreatedSince(
	username: string,
	since: string,
	publicOnly: boolean,
	filterOrgs: string[] | null,
): Promise<RepoInfo[]> {
	const sinceDate = new Date(since);
	const repos: RepoInfo[] = [];

	// Determine which orgs to check
	const orgsToCheck = filterOrgs ?? [
		username,
		...(await fetchUserOrgs(username)),
	];

	for (const org of orgsToCheck) {
		try {
			const isUser = org === username;
			const endpoint = isUser
				? `users/${username}/repos?type=${publicOnly ? "public" : "all"}&sort=created&direction=desc&per_page=100`
				: `orgs/${org}/repos?sort=created&direction=desc&per_page=100`;

			const { stdout } = await execa("gh", ["api", endpoint]);
			const orgRepos = JSON.parse(stdout) as RawRepo[];
			for (const repo of orgRepos) {
				if (new Date(repo.created_at) >= sinceDate) {
					repos.push({ name: repo.name, org: repo.owner.login });
				}
			}
		} catch {
			// Ignore errors for individual orgs
		}
	}

	// Deduplicate
	return repos.filter(
		(repo, index, self) =>
			self.findIndex((r) => r.name === repo.name && r.org === repo.org) ===
			index,
	);
}

export async function fetchGitHubActivity(
	username: string,
	days: number,
	publicOnly: boolean,
	filterOrgs: string[] | null = null,
): Promise<GitHubActivity> {
	const since = getSinceDate(days);
	const today = formatDate(new Date());
	const visibilityFilter = publicOnly ? " is:public" : "";

	// Build org filter string: "org:X org:Y" (implicit OR)
	const orgFilter = filterOrgs
		? ` ${filterOrgs.map((o) => `org:${o}`).join(" ")}`
		: "";

	// Fetch all data in parallel with pagination
	const [
		prsCreatedItems,
		prsMergedItems,
		prsReviewedItems,
		issuesCreatedItems,
		issuesClosedItems,
		commitsItems,
		repos_created,
	] = await Promise.all([
		ghApiPaginated<RawPR>("search/issues", {
			q: `author:${username} type:pr created:>=${since}${visibilityFilter}${orgFilter}`,
		}),
		ghApiPaginated<RawPR>("search/issues", {
			q: `author:${username} type:pr merged:>=${since}${visibilityFilter}${orgFilter}`,
		}),
		ghApiPaginated<RawPR>("search/issues", {
			q: `reviewed-by:${username} type:pr created:>=${since} -author:${username}${visibilityFilter}${orgFilter}`,
		}),
		ghApiPaginated<RawPR>("search/issues", {
			q: `author:${username} type:issue created:>=${since}${visibilityFilter}${orgFilter}`,
		}),
		ghApiPaginated<RawPR>("search/issues", {
			q: `author:${username} type:issue closed:>=${since}${visibilityFilter}${orgFilter}`,
		}),
		ghApiPaginated<RawCommit>("search/commits", {
			q: `author:${username} committer-date:>=${since}${orgFilter}`,
		}),
		fetchReposCreatedSince(username, since, publicOnly, filterOrgs),
	]);

	const prs_created_raw = prsCreatedItems.map(parsePR);
	const prs_merged_raw = prsMergedItems.map(parsePR);
	const prs_reviewed = prsReviewedItems.map(parsePR);
	const issues_created = issuesCreatedItems.map(parseIssue);
	const issues_closed = issuesClosedItems.map(parseIssue);
	const commits = commitsItems.map(parseCommit);

	// Enrich PRs with LOC stats (created and merged, in parallel)
	const [prs_created, prs_merged] = await Promise.all([
		enrichPRsWithStats(prs_created_raw),
		enrichPRsWithStats(prs_merged_raw),
	]);

	// Calculate aggregate stats from all authored PRs (deduplicated)
	const stats = calculateStats([...prs_created, ...prs_merged]);

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
		stats,
	};
}
