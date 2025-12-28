export interface PullRequest {
	repo: string;
	org: string;
	title: string;
	number: number;
	state?: string;
	url: string;
}

export interface Issue {
	repo: string;
	org: string;
	title: string;
	number: number;
	url: string;
}

export interface Commit {
	repo: string;
	org: string;
	message: string;
	url: string;
	date: string;
}

export interface RepoInfo {
	name: string;
	org: string;
}

export interface GitHubActivity {
	user: string;
	date: string;
	period: string;
	prs_created: PullRequest[];
	prs_merged: PullRequest[];
	prs_reviewed: PullRequest[];
	issues_created: Issue[];
	issues_closed: Issue[];
	commits: Commit[];
	repos_created: RepoInfo[];
	repos_touched: string[];
}

export interface Options {
	username?: string;
	days: number;
	english: boolean;
	format: "slack" | "markdown" | "plain";
	publicOnly: boolean;
	interactive: boolean;
	model?: string;
}

export type OutputFormat = "slack" | "markdown" | "plain";
export type Language = "en" | "de";
export type Verbosity = "brief" | "normal" | "detailed";
