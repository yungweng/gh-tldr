import { execa } from "execa";
import type { GitHubActivity, Language } from "./types.js";

const summaryPromptEn = `Based on this GitHub activity data, write a brief 2-4 sentence summary of what was accomplished. Mention specific PR/issue titles to provide context. Write casually and informally. No bullet points, just a paragraph. No emojis.

GitHub Activity Data:`;

const summaryPromptDe = `Basierend auf diesen GitHub-Aktivitätsdaten, schreibe eine kurze Zusammenfassung in 2-4 Sätzen was gemacht wurde. Erwähne konkret die PR/Issue-Titel um Kontext zu geben. Schreibe locker und informell. Keine Aufzählungen, nur ein Absatz. Keine Emojis.

GitHub-Aktivitätsdaten:`;

export async function generateSummaryText(
	activity: GitHubActivity,
	lang: Language,
	model?: string,
): Promise<string> {
	const prompt = lang === "en" ? summaryPromptEn : summaryPromptDe;
	const fullPrompt = `${prompt}\n${JSON.stringify(activity, null, 2)}`;

	const args = ["-p", "-", "--output-format", "text"];
	if (model) {
		args.push("--model", model);
	}

	const { stdout } = await execa("claude", args, {
		input: fullPrompt,
	});

	return stdout.trim();
}
