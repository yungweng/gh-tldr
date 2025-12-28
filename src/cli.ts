import { Command } from "commander";
import chalk from "chalk";
import { fetchGitHubActivity, getAuthenticatedUser } from "./github.js";
import { formatActivity, hasActivity } from "./output.js";
import { generateSummary } from "./claude.js";
import { runInteractive } from "./interactive.js";
import type { OutputFormat, Language } from "./types.js";

async function checkDependencies(): Promise<void> {
  const { execa } = await import("execa");

  const deps = [
    { cmd: "gh", name: "GitHub CLI", installHint: "brew install gh" },
    { cmd: "claude", name: "Claude Code CLI", installHint: "npm install -g @anthropic-ai/claude-code" },
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
    console.error(chalk.red("GitHub CLI not authenticated. Run 'gh auth login'."));
    process.exit(1);
  }
}

interface CliOptions {
  days: string;
  english: boolean;
  format: OutputFormat;
  publicOnly: boolean;
  interactive: boolean;
  model?: string;
}

async function execute(
  username: string,
  days: number,
  lang: Language,
  format: OutputFormat,
  publicOnly: boolean,
  model?: string
): Promise<void> {
  // Resolve username
  const resolvedUsername = username || (await getAuthenticatedUser());

  console.error(chalk.yellow(`Fetching GitHub activity for ${resolvedUsername}...`));

  const activity = await fetchGitHubActivity(resolvedUsername, days, publicOnly);

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

  console.error(chalk.yellow("Generating summary with Claude..."));

  const summary = await generateSummary(activity, lang, model);
  console.log("");
  console.log(summary);
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
    .option("-f, --format <type>", "Output format: slack|markdown|plain", "slack")
    .option("-p, --public-only", "Exclude private repositories", false)
    .option("-i, --interactive", "Force interactive mode", false)
    .option("-m, --model <model>", "Claude model to use (e.g., sonnet, opus, haiku)")
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
            answers.model || undefined
          );
        } else {
          // Direct mode
          const days = parseInt(options.days, 10);
          const lang: Language = options.english ? "en" : "de";
          const format = options.format as OutputFormat;

          await execute(username || "", days, lang, format, options.publicOnly, options.model);
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
