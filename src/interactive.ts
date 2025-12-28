import { input, select, confirm } from "@inquirer/prompts";
import type { OutputFormat, Language } from "./types.js";

interface InteractiveOptions {
  username: string;
  days: number;
  language: Language;
  format: OutputFormat;
  includePrivate: boolean;
  model: string;
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

  const model = await input({
    message: "Claude model (leave empty for default)",
    default: "",
  });

  return {
    username,
    days,
    language,
    format,
    includePrivate,
    model,
  };
}
