import { execa } from "execa";
import type { GitHubActivity, Language } from "./types.js";
import { getPrompt } from "./prompts/index.js";

export async function generateSummary(
  activity: GitHubActivity,
  lang: Language,
  model?: string
): Promise<string> {
  const prompt = getPrompt(lang);
  const fullPrompt = `${prompt}\n${JSON.stringify(activity, null, 2)}`;

  const args = ["-p", "-", "--output-format", "text"];
  if (model) {
    args.push("--model", model);
  }

  const { stdout } = await execa("claude", args, {
    input: fullPrompt,
  });

  return stdout;
}
