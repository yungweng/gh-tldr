# Verbosity Levels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--verbosity brief|normal|detailed` flag to control Claude summary length (1-2, 2-4, or 5-8 sentences).

**Architecture:** Add `Verbosity` type, update prompt builder in `claude.ts` to dynamically construct prompts based on verbosity, add CLI flag and interactive prompt, wire through `execute()` function.

**Tech Stack:** TypeScript, Commander.js (CLI), @inquirer/prompts (interactive)

---

## Task 1: Add Verbosity Type

**Files:**
- Modify: `src/types.ts:54-55` (add after `Language` type)

**Step 1: Add the Verbosity type**

Add at the end of `src/types.ts`:

```typescript
export type Verbosity = "brief" | "normal" | "detailed";
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Verbosity type"
```

---

## Task 2: Update Claude Prompt Generation

**Files:**
- Modify: `src/claude.ts` (replace static prompts with dynamic builder)

**Step 1: Replace the entire claude.ts file**

```typescript
import { execa } from "execa";
import type { GitHubActivity, Language, Verbosity } from "./types.js";

const sentenceCounts: Record<Verbosity, Record<Language, string>> = {
	brief: { en: "1-2 sentence", de: "1-2 Sätzen" },
	normal: { en: "2-4 sentence", de: "2-4 Sätzen" },
	detailed: { en: "5-8 sentence", de: "5-8 Sätzen" },
};

const detailSuffix: Record<Language, string> = {
	en: " with more context about each item",
	de: " mit mehr Kontext zu jedem Punkt",
};

function buildPrompt(lang: Language, verbosity: Verbosity): string {
	const count = sentenceCounts[verbosity][lang];
	const extra = verbosity === "detailed" ? detailSuffix[lang] : "";

	if (lang === "en") {
		return `Based on this GitHub activity data, write a ${count} summary of what was accomplished${extra}. Mention specific PR/issue titles to provide context. Write casually and informally. No bullet points, just a paragraph. No emojis.

GitHub Activity Data:`;
	}

	return `Basierend auf diesen GitHub-Aktivitätsdaten, schreibe eine Zusammenfassung in ${count}${extra} was gemacht wurde. Erwähne konkret die PR/Issue-Titel um Kontext zu geben. Schreibe locker und informell. Keine Aufzählungen, nur ein Absatz. Keine Emojis.

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
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: Errors about missing `verbosity` argument at call sites (expected, will fix in Task 4)

**Step 3: Commit**

```bash
git add src/claude.ts
git commit -m "feat: add dynamic prompt builder with verbosity support"
```

---

## Task 3: Add Interactive Verbosity Prompt

**Files:**
- Modify: `src/interactive.ts` (add verbosity to interface and prompt)

**Step 1: Update the InteractiveOptions interface**

Add `verbosity: Verbosity` to the interface at line 4-11:

```typescript
import { confirm, input, select } from "@inquirer/prompts";
import type { Language, OutputFormat, Verbosity } from "./types.js";

interface InteractiveOptions {
	username: string;
	days: number;
	language: Language;
	verbosity: Verbosity;
	format: OutputFormat;
	includePrivate: boolean;
	model: string;
}
```

**Step 2: Add verbosity prompt after language prompt**

Insert after the language `select` (after line 36) and before the format `select`:

```typescript
	const verbosity = await select({
		message: "Summary verbosity",
		choices: [
			{ name: "Brief (1-2 sentences)", value: "brief" as Verbosity },
			{ name: "Normal (2-4 sentences)", value: "normal" as Verbosity },
			{ name: "Detailed (5-8 sentences)", value: "detailed" as Verbosity },
		],
		default: "normal" as Verbosity,
	});
```

**Step 3: Add verbosity to return object**

Update the return object to include `verbosity`:

```typescript
	return {
		username,
		days,
		language,
		verbosity,
		format,
		includePrivate,
		model,
	};
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: Errors about call sites (expected, will fix in Task 4)

**Step 5: Commit**

```bash
git add src/interactive.ts
git commit -m "feat: add verbosity prompt to interactive mode"
```

---

## Task 4: Wire Up CLI and Execute Function

**Files:**
- Modify: `src/cli.ts` (add flag, update execute signature, wire calls)

**Step 1: Add Verbosity import**

Update the imports at line 7:

```typescript
import type { Language, OutputFormat, Verbosity } from "./types.js";
```

**Step 2: Add verbosity to CliOptions interface**

Update the interface at lines 50-57:

```typescript
interface CliOptions {
	days: string;
	english: boolean;
	format: OutputFormat;
	publicOnly: boolean;
	interactive: boolean;
	verbosity: string;
	model?: string;
}
```

**Step 3: Add verbosity parameter to execute function**

Update the function signature at line 59-66:

```typescript
async function execute(
	username: string,
	days: number,
	lang: Language,
	format: OutputFormat,
	publicOnly: boolean,
	verbosity: Verbosity,
	model?: string,
): Promise<void> {
```

**Step 4: Update generateSummaryText call in execute**

Update line 98 to pass verbosity:

```typescript
	const summaryText = await generateSummaryText(activity, lang, verbosity, model);
```

**Step 5: Add validation helper function**

Add before the `run()` function:

```typescript
function validateVerbosity(value: string): Verbosity {
	const valid: Verbosity[] = ["brief", "normal", "detailed"];
	return valid.includes(value as Verbosity) ? (value as Verbosity) : "normal";
}
```

**Step 6: Add CLI flag**

Add after the `-p, --public-only` option (after line 122):

```typescript
		.option(
			"-v, --verbosity <level>",
			"Summary verbosity: brief|normal|detailed",
			"normal",
		)
```

**Step 7: Update interactive mode call**

Update the execute call in interactive mode (around line 139-146):

```typescript
					await execute(
						answers.username,
						answers.days,
						answers.language,
						answers.format,
						!answers.includePrivate,
						answers.verbosity,
						answers.model || undefined,
					);
```

**Step 8: Update direct mode call**

Update the execute call in direct mode (around line 153-160):

```typescript
					await execute(
						username || "",
						days,
						lang,
						format,
						options.publicOnly,
						validateVerbosity(options.verbosity),
						options.model,
					);
```

**Step 9: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 10: Run linter**

Run: `pnpm lint`
Expected: No errors (or fix any formatting issues with `pnpm lint:fix`)

**Step 11: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add --verbosity flag and wire through execute"
```

---

## Task 5: Build and Manual Test

**Step 1: Build the project**

Run: `pnpm build`
Expected: Successful build

**Step 2: Test help output**

Run: `pnpm start -- --help`
Expected: Shows `-v, --verbosity <level>` in options

**Step 3: Test brief verbosity**

Run: `pnpm start -- -d 7 -e -v brief`
Expected: Summary is 1-2 sentences

**Step 4: Test detailed verbosity**

Run: `pnpm start -- -d 7 -e -v detailed`
Expected: Summary is 5-8 sentences

**Step 5: Test interactive mode**

Run: `pnpm start`
Expected: Shows "Summary verbosity" prompt after language selection

**Step 6: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found in manual testing"
```

---

## Task 6: Final Commit and PR Prep

**Step 1: Verify all changes**

Run: `git status && git diff --stat main`
Expected: Changes in `types.ts`, `claude.ts`, `interactive.ts`, `cli.ts`

**Step 2: Run full verification**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: All pass

**Step 3: Squash or organize commits (optional)**

If you want a cleaner history:
```bash
git rebase -i main
```

Or leave as-is for detailed commit history.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/types.ts` | Add `Verbosity` type |
| `src/claude.ts` | Dynamic prompt builder with verbosity parameter |
| `src/interactive.ts` | Add verbosity prompt after language |
| `src/cli.ts` | Add `-v, --verbosity` flag, wire through execute |

**Total: ~60 lines changed across 4 files**
