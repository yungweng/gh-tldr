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

function getShellEnv(): Record<string, string> {
	// Ensure we have a proper PATH that includes common bin directories
	const currentPath = process.env.PATH || "";
	const home = homedir();
	const additionalPaths = [
		join(home, ".local", "bin"),
		join(home, ".claude", "bin"),
		"/usr/local/bin",
		"/opt/homebrew/bin",
	];

	const newPath = [...additionalPaths, currentPath].join(":");

	return {
		...process.env,
		PATH: newPath,
		HOME: home,
	};
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
	console.error(`[DEBUG] Claude path: ${claudePath}`);
	console.error(`[DEBUG] Claude exists: ${existsSync(claudePath)}`);
	console.error(`[DEBUG] HOME: ${homedir()}`);

	try {
		const result = await execa(claudePath, args, {
			input: fullPrompt,
			env: getShellEnv(),
		});
		return result.stdout.trim();
	} catch (error) {
		// Log the raw error immediately before any processing
		process.stderr.write("\n=== EXECA ERROR (raw) ===\n");
		try {
			process.stderr.write(
				JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2),
			);
		} catch {
			process.stderr.write(String(error));
		}
		process.stderr.write("\n=== END EXECA ERROR ===\n");

		// Re-throw with details
		const execaError = error as {
			message?: string;
			stderr?: string;
			stdout?: string;
			exitCode?: number;
			command?: string;
			shortMessage?: string;
		};

		throw new Error(
			`Claude CLI failed: ${execaError.shortMessage || execaError.message || "Unknown error"}`,
		);
	}
}
