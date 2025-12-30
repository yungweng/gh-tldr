import chalk from "chalk";
import { Command } from "commander";
import { generateSummaryText } from "./claude.js";
import { fetchGitHubActivity, getAuthenticatedUser } from "./github.js";
import { runInteractive } from "./interactive.js";
import { formatActivity, hasActivity } from "./output.js";
import type { Language, OutputFormat, Verbosity } from "./types.js";

async function checkDependencies(): Promise<void> {
	const { execa } = await import("execa");

	const deps = [
		{ cmd: "gh", name: "GitHub CLI", installHint: "brew install gh" },
		{
			cmd: "claude",
			name: "Claude Code CLI",
			installHint: "npm install -g @anthropic-ai/claude-code",
		},
	];

	const missing: string[] = [];

	for (const dep of deps) {
		try {
			await execa("which", [dep.cmd]);
		} catch {
			missing.push(`${dep.name} (${dep.installHint})`);
		}
	}

	if (missing.length > 0) {
		console.error(chalk.red("Missing dependencies:"));
		for (const m of missing) {
			console.error(`  - ${m}`);
		}
		process.exit(1);
	}

	// Check gh auth
	try {
		await execa("gh", ["auth", "status"]);
	} catch {
		console.error(
			chalk.red("GitHub CLI not authenticated. Run 'gh auth login'."),
		);
		process.exit(1);
	}
}

interface CliOptions {
	days: string;
	english: boolean;
	format: OutputFormat;
	publicOnly: boolean;
	interactive: boolean;
	verbosity: string;
	orgs?: string;
	model?: string;
}

function validateVerbosity(value: string): Verbosity {
	const valid: Verbosity[] = ["brief", "normal", "detailed"];
	return valid.includes(value as Verbosity) ? (value as Verbosity) : "normal";
}

async function execute(
	username: string,
	days: number,
	lang: Language,
	format: OutputFormat,
	publicOnly: boolean,
	verbosity: Verbosity,
	filterOrgs: string[] | null,
	model?: string,
): Promise<void> {
	// Resolve username
	const resolvedUsername = username || (await getAuthenticatedUser());

	const scopeInfo = filterOrgs ? ` in ${filterOrgs.join(", ")}` : "";
	console.error(
		chalk.yellow(
			`Fetching GitHub activity for ${resolvedUsername}${scopeInfo}...`,
		),
	);

	const activity = await fetchGitHubActivity(
		resolvedUsername,
		days,
		publicOnly,
		filterOrgs,
	);

	if (!hasActivity(activity)) {
		console.log("");
		console.log(`tl;dr ${activity.date}`);
		console.log("");
		const noActivity =
			lang === "en"
				? `No GitHub activity in the ${activity.period}.`
				: `Keine GitHub-Aktivität in den ${activity.period}.`;
		console.log(noActivity);
		return;
	}

	// Format stats locally
	const stats = formatActivity(activity, format, lang);

	console.error(chalk.yellow("Generating summary with Claude..."));

	// Only ask Claude for the summary paragraph
	const summaryText = await generateSummaryText(
		activity,
		lang,
		verbosity,
		model,
	);

	console.log("");
	console.log(stats);
	console.log("");
	console.log("---");
	console.log(summaryText);
}

export async function run(): Promise<void> {
	const program = new Command();

	program
		.name("gh-tldr")
		.description("Generate a TL;DR summary of your GitHub activity")
		.version("1.0.0")
		.argument("[username]", "GitHub username (defaults to authenticated user)")
		.option("-d, --days <n>", "Time period in days", "1")
		.option("-e, --english", "Output in English (default: German)", false)
		.option(
			"-f, --format <type>",
			"Output format: slack|markdown|plain",
			"slack",
		)
		.option("-p, --public-only", "Exclude private repositories", false)
		.option("-i, --interactive", "Force interactive mode", false)
		.option(
			"-v, --verbosity <level>",
			"Summary verbosity: brief|normal|detailed",
			"normal",
		)
		.option(
			"-o, --orgs <orgs>",
			"Filter by organizations/accounts (comma-separated)",
		)
		.option(
			"-m, --model <model>",
			"Claude model to use (e.g., sonnet, opus, haiku)",
		)
		.action(async (username: string | undefined, options: CliOptions) => {
			try {
				await checkDependencies();

				// Determine if we should run interactive mode
				const hasArgs = process.argv.length > 2;
				const forceInteractive = options.interactive;

				if (!hasArgs || forceInteractive) {
					// Interactive mode
					const answers = await runInteractive();
					await execute(
						answers.username,
						answers.days,
						answers.language,
						answers.format,
						!answers.includePrivate,
						answers.verbosity,
						answers.selectedOrgs,
						answers.model || undefined,
					);
				} else {
					// Direct mode
					const days = parseInt(options.days, 10);
					const lang: Language = options.english ? "en" : "de";
					const format = options.format as OutputFormat;

					// Parse orgs flag
					const filterOrgs = options.orgs
						? options.orgs
								.split(",")
								.map((o) => o.trim())
								.filter(Boolean)
						: null;

					await execute(
						username || "",
						days,
						lang,
						format,
						options.publicOnly,
						validateVerbosity(options.verbosity),
						filterOrgs && filterOrgs.length > 0 ? filterOrgs : null,
						options.model,
					);
				}
			} catch (error) {
				if (error instanceof Error) {
					console.error(chalk.red(`Error: ${error.message}`));
				}
				process.exit(1);
			}
		});

	await program.parseAsync();
}
