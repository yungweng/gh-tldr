# gh-tldr

Generates a TL;DR summary of your GitHub activity from the last 24 hours for Slack.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) - authenticated
- [jq](https://jqlang.github.io/jq/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)

```bash
# macOS
brew install gh jq

# Authenticate gh
gh auth login
```

## Installation

```bash
# Clone repo
git clone https://github.com/YOUR_USER/gh-tldr.git
cd gh-tldr

# Optional: Symlink to PATH
ln -s "$(pwd)/gh-tldr" /usr/local/bin/gh-tldr
```

## Usage

```bash
# Your own activity (uses gh auth user)
./gh-tldr

# Specific user
./gh-tldr yungweng
```

## Output

```
tl;dr 28.12

• 3 PRs created (repo-a, repo-b)
• 5 PRs reviewed/approved (repo-c)
• 2 PRs merged (repo-a)
• 1 Issue closed (repo-d)

Repos: org/repo-a, org/repo-b, org/repo-c, org/repo-d

---
Mainly worked on Feature X. Completed and merged PR "Add user authentication".
Did several code reviews for the team, including the new API endpoint.
```

## Customization

- **Modify prompt:** Edit `prompt.txt` for a different output style
- **Change time period:** Adjust the `SINCE` parameter in `fetch-github-activity.sh`
