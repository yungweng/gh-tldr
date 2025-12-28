import { execa } from "execa";
import type { GitHubActivity, Language } from "./types.js";
import { getPrompt } from "./prompts/index.js";

export async function generateSummary(
  activity: GitHubActivity,
  lang: Language
): Promise<string> {
  const prompt = getPrompt(lang);
  const fullPrompt = `${prompt}\n${JSON.stringify(activity, null, 2)}`;

  const { stdout } = await execa("claude", ["-p", "-", "--output-format", "text"], {
    input: fullPrompt,
  });

  return stdout;
}
