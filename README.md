<p align="center">
  <img src="https://img.shields.io/npm/v/gh-tldr.svg" alt="npm version">
  <img src="https://img.shields.io/npm/l/gh-tldr.svg" alt="license">
  <img src="https://img.shields.io/node/v/gh-tldr.svg" alt="node version">
</p>

# gh-tldr

**AI-powered TL;DR of your GitHub activity**

Stop manually tracking what you did this week. `gh-tldr` fetches your GitHub activity and uses Claude AI to generate a human-readable summary—perfect for standups, status updates, or weekly reports.

<!-- TODO: Add demo GIF here -->
<!-- <p align="center">
  <img src="assets/demo.gif" alt="gh-tldr demo" width="600">
</p> -->

## Quick Start

```bash
npx gh-tldr
```

That's it. Follow the prompts.

## Features

- 📊 Summarizes PRs, reviews, commits, and issues
- 🤖 Powered by Claude AI for natural language summaries
- 🔄 Interactive or scripted mode
- 📝 Multiple output formats (plain text, markdown, slack)
- 🔒 Private repository support
- 🌍 English and German output

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [GitHub CLI](https://cli.github.com/) (`gh`) - authenticated
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)

<details>
<summary>macOS quick setup</summary>

```bash
brew install gh node
gh auth login
```

</details>

## Installation

The easiest way is `npx gh-tldr` (no install needed).

<details>
<summary>Alternative: Install globally</summary>

```bash
git clone https://github.com/yungweng/gh-tldr.git
cd gh-tldr
pnpm install
pnpm build
pnpm link --global
```

</details>

<details>
<summary>Note for Aikido Safe-Chain users</summary>

If you use [Aikido Safe-Chain](https://github.com/AikidoSec/safe-chain), you may need to bypass it:

```bash
# Bash/Zsh
\npx gh-tldr

# Fish
command npx gh-tldr
```

Or add an alias:
```bash
# ~/.bashrc or ~/.zshrc
alias gh-tldr='\npx gh-tldr'

# ~/.config/fish/config.fish
alias gh-tldr='command npx gh-tldr'
```

</details>

## Usage

### Interactive Mode

```bash
gh-tldr
```

```
? GitHub username (leave empty for authenticated user)
? Time period › Last 24 hours / Last 7 days / Last 30 days
? Language › English / German
? Output format › Plain text / Markdown / Slack
? Include private repos? (y/N)
? Claude model (leave empty for default)
```

### Direct Mode

```bash
gh-tldr [username] [options]
```

| Option | Description |
|--------|-------------|
| `-d, --days <n>` | Time period in days (default: 1) |
| `-e, --english` | Output in English (default: German) |
| `-f, --format <type>` | Output: `plain` \| `markdown` \| `slack` |
| `-p, --public-only` | Exclude private repositories |
| `-m, --model <model>` | Claude model (e.g., haiku, sonnet, opus) |
| `-i, --interactive` | Force interactive mode |
| `-h, --help` | Show help |

### Examples

```bash
# Last 7 days in English
gh-tldr --days 7 --english

# Specific user, public repos only
gh-tldr yungweng --public-only

# Use Haiku model for faster results
gh-tldr --model haiku

# Markdown output for documentation
gh-tldr --days 30 --format markdown
```

## Example Output

```
tl;dr 28.12.2025

• 3 PRs created (repo-a, repo-b)
• 5 PRs reviewed (repo-c)
• 2 PRs merged (repo-a)
• 1 issue closed (repo-d)
• 12 commits (repo-a, repo-b)

Repos: org/repo-a, org/repo-b, org/repo-c, org/repo-d

---
Mainly worked on Feature X. Completed and merged PR "Add user authentication".
Did several code reviews for the team, including the new API endpoint.
```

## Development

```bash
pnpm dev        # Run in dev mode
pnpm build      # Build
pnpm typecheck  # Type check
```

## Contributing

Issues and PRs welcome! See [open issues](https://github.com/yungweng/gh-tldr/issues).

## Links

- [Repository](https://github.com/yungweng/gh-tldr)
- [Issues](https://github.com/yungweng/gh-tldr/issues)
- [npm](https://www.npmjs.com/package/gh-tldr)

## Author

Maintained by [@yungweng](https://github.com/yungweng)

## License

MIT
