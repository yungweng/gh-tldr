import { execa } from "execa";
import type { GitHubActivity, Language, Verbosity } from "./types.js";

const wordLimits: Record<Verbosity, Record<Language, string>> = {
	brief: { en: "20-40 word", de: "20-40 Wörter" },
	normal: { en: "50-80 word", de: "50-80 Wörter" },
	detailed: { en: "150-200 word", de: "150-200 Wörter" },
};

function buildPrompt(lang: Language, verbosity: Verbosity): string {
	const limit = wordLimits[verbosity][lang];

	if (lang === "en") {
		return `Based on this GitHub activity data, write a summary of what was accomplished. STRICT LIMIT: ${limit}. Mention specific PR/issue titles. If stats are available, include the lines of code changed (additions/deletions) as a brief mention. Casual tone, no bullet points, no emojis.

GitHub Activity Data:`;
	}

	return `Basierend auf diesen GitHub-Aktivitätsdaten, schreibe eine Zusammenfassung was gemacht wurde. STRIKTES LIMIT: ${limit}. Erwähne konkret die PR/Issue-Titel. Falls Stats verfügbar sind, erwähne kurz die geänderten Codezeilen (Additions/Deletions). Lockerer Ton, keine Aufzählungen, keine Emojis.

GitHub-Aktivitätsdaten:`;
}

export async function generateSummaryText(
	activity: GitHubActivity,
	lang: Language,
	verbosity: Verbosity = "normal",
	model?: string,
): Promise<string> {
	const prompt = buildPrompt(lang, verbosity);
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
