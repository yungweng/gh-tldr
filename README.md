# gh-tldr

Generate a TL;DR summary of your GitHub activity using Claude.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [GitHub CLI](https://cli.github.com/) (`gh`) - authenticated
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)

```bash
# macOS
brew install gh node

# Authenticate gh
gh auth login
```

## Installation

```bash
# Clone and install
git clone https://github.com/moto-nrw/gh-tldr.git
cd gh-tldr
pnpm install
pnpm build

# Link globally
pnpm link --global
```

Or via npx:
```bash
npx gh-tldr
```

### Note for Aikido Safe-Chain Users

If you use [Aikido Safe-Chain](https://github.com/AikidoSec/safe-chain), you may need to bypass it when running via npx:

```bash
# Bash/Zsh
\npx gh-tldr

# Fish
command npx gh-tldr
```

Or add an alias to your shell config:
```bash
# ~/.bashrc or ~/.zshrc
alias gh-tldr='\npx gh-tldr'

# ~/.config/fish/config.fish
alias gh-tldr='command npx gh-tldr'
```

## Usage

### Interactive Mode

Run without arguments for guided prompts:

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

Use flags for scripting:

```bash
# Basic usage
gh-tldr --days 7 --english

# All options
gh-tldr [username] [options]

Options:
  -d, --days <n>       Time period in days (default: 1)
  -e, --english        Output in English (default: German)
  -f, --format <type>  Output format: plain|markdown|slack (default: slack)
  -p, --public-only    Exclude private repositories
  -m, --model <model>  Claude model (e.g., haiku, sonnet, opus)
  -i, --interactive    Force interactive mode
  -h, --help           Show help
```

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

## Output

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
# Run in dev mode
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck
```

## License

MIT
