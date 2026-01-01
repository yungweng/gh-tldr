import { confirm, input, select } from "@inquirer/prompts";
import { fetchUserOrgs, getAuthenticatedUser } from "./github.js";
import type { Language, OutputFormat, Verbosity } from "./types.js";

interface InteractiveOptions {
	username: string;
	days: number;
	language: Language;
	verbosity: Verbosity;
	format: OutputFormat;
	includePrivate: boolean;
	selectedOrgs: string[] | null;
	model: string;
	customPrompt: string;
}

export async function runInteractive(): Promise<InteractiveOptions> {
	const username = await input({
		message: "GitHub username (leave empty for authenticated user)",
		default: "",
	});

	const days = await select({
		message: "Time period",
		choices: [
			{ name: "Last 24 hours", value: 1 },
			{ name: "Last 7 days", value: 7 },
			{ name: "Last 30 days", value: 30 },
		],
		default: 1,
	});

	const language = await select({
		message: "Language",
		choices: [
			{ name: "English", value: "en" as Language },
			{ name: "German", value: "de" as Language },
		],
		default: "en" as Language,
	});

	const verbosity = await select({
		message: "Summary verbosity",
		choices: [
			{ name: "Brief (~30 words)", value: "brief" as Verbosity },
			{ name: "Normal (~60 words)", value: "normal" as Verbosity },
			{ name: "Detailed (~175 words)", value: "detailed" as Verbosity },
		],
		default: "normal" as Verbosity,
	});

	const format = await select({
		message: "Output format",
		choices: [
			{ name: "Plain text", value: "plain" as OutputFormat },
			{ name: "Markdown", value: "markdown" as OutputFormat },
			{ name: "Slack", value: "slack" as OutputFormat },
		],
		default: "plain" as OutputFormat,
	});

	const includePrivate = await confirm({
		message: "Include private repos?",
		default: true,
	});

	// Fetch available orgs for the user
	const resolvedUsername = username || (await getAuthenticatedUser());
	const userOrgs = await fetchUserOrgs(resolvedUsername);
	const allScopes = [resolvedUsername, ...userOrgs];

	// Build choices with "All" as first option
	const ALL_VALUE = "__ALL__";
	const scopeChoices = [
		{ name: "All (no filter)", value: ALL_VALUE },
		...allScopes.map((org) => ({ name: org, value: org })),
	];

	const scopeSelection = await select({
		message: "Filter by scope",
		choices: scopeChoices,
		default: ALL_VALUE,
	});

	// If "All" selected, no filtering; otherwise filter to that single org
	// For multi-org selection, user can use CLI --orgs flag
	const selectedOrgs = scopeSelection === ALL_VALUE ? null : [scopeSelection];

	const model = await input({
		message: "Claude model (leave empty for default)",
		default: "",
	});

	const customPrompt = await input({
		message: "Any specific focus for the summary? (optional)",
		default: "",
	});

	return {
		username,
		days,
		language,
		verbosity,
		format,
		includePrivate,
		selectedOrgs,
		model,
		customPrompt,
	};
}
