import { execa } from "execa";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { GitHubActivity, Language, Verbosity } from "./types.js";

function findClaudeCli(): string {
	// Common installation paths for Claude CLI
	const candidates = [
		join(homedir(), ".local", "bin", "claude"),
		join(homedir(), ".claude", "bin", "claude"),
		"/usr/local/bin/claude",
		"/opt/homebrew/bin/claude",
	];

	for (const path of candidates) {
		if (existsSync(path)) {
			return path;
		}
	}

	// Fall back to PATH lookup
	return "claude";
}

const wordLimits: Record<Verbosity, Record<Language, string>> = {
	brief: { en: "20-40 word", de: "20-40 Wörter" },
	normal: { en: "50-80 word", de: "50-80 Wörter" },
	detailed: { en: "150-200 word", de: "150-200 Wörter" },
};

function buildPrompt(lang: Language, verbosity: Verbosity): string {
	const limit = wordLimits[verbosity][lang];

	if (lang === "en") {
		return `Based on this GitHub activity data, write a summary of what was accomplished. STRICT LIMIT: ${limit}. Mention specific PR/issue titles. Casual tone, no bullet points, no emojis.

GitHub Activity Data:`;
	}

	return `Basierend auf diesen GitHub-Aktivitätsdaten, schreibe eine Zusammenfassung was gemacht wurde. STRIKTES LIMIT: ${limit}. Erwähne konkret die PR/Issue-Titel. Lockerer Ton, keine Aufzählungen, keine Emojis.

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

	const claudePath = findClaudeCli();

	try {
		const { stdout } = await execa(claudePath, args, {
			input: fullPrompt,
		});
		return stdout.trim();
	} catch (error) {
		if (error instanceof Error && "stderr" in error) {
			const stderr = (error as { stderr: string }).stderr;
			if (stderr) {
				throw new Error(`Claude CLI failed: ${stderr}`);
			}
		}
		throw error;
	}
}
