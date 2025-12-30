# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gh-tldr is a CLI tool that fetches GitHub activity and uses Claude AI to generate human-readable summaries. Perfect for standups, status updates, or weekly reports.

## Commands

```bash
# Install dependencies
pnpm install

# Development (runs TypeScript directly)
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format

# Run built CLI
pnpm start
# or
node dist/index.js
```

## Architecture

**Single package CLI tool:**

- `src/index.ts` - Entry point, shebang for CLI
- `src/cli.ts` - Commander.js CLI setup, argument parsing
- `src/interactive.ts` - Interactive prompts using @inquirer/prompts
- `src/github.ts` - GitHub API via `gh` CLI (search, activity fetching)
- `src/claude.ts` - Claude AI integration via `claude` CLI
- `src/output.ts` - Output formatting (plain, markdown, slack)
- `src/types.ts` - TypeScript types

**Data flow:**

1. CLI parses args or runs interactive prompts
2. `github.ts` fetches activity via `gh api` (PRs, reviews, commits, issues)
3. `claude.ts` sends activity to Claude for summarization
4. `output.ts` formats the summary based on chosen format

**Key dependencies:**

- `commander` - CLI framework
- `@inquirer/prompts` - Interactive prompts
- `execa` - Shell command execution (for `gh` and `claude` CLI)
- `chalk` - Terminal colors

## CLI Options

| Option | Description |
|--------|-------------|
| `-d, --days <n>` | Time period in days (default: 1) |
| `-e, --english` | Output in English (default: German) |
| `-f, --format <type>` | Output: `plain` \| `markdown` \| `slack` |
| `-p, --public-only` | Exclude private repositories |
| `-m, --model <model>` | Claude model (e.g., haiku, sonnet, opus) |
| `-o, --orgs <orgs>` | Filter by organizations (comma-separated) |
| `-i, --interactive` | Force interactive mode |

## Publishing

```bash
# 1. Bump version
npm version patch  # or minor/major

# 2. Commit and push
git push origin main --tags

# 3. Create release (triggers CD pipeline)
gh release create vX.Y.Z --generate-notes
```

Publishing is automated via GitHub Actions with OIDC trusted publishing (no npm tokens).

## External Dependencies

Requires these CLIs installed and authenticated:
- `gh` - GitHub CLI
- `claude` - Claude Code CLI
