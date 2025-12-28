# gh-tldr

Generiert eine TL;DR-Zusammenfassung deiner GitHub-Aktivität der letzten 24 Stunden für Slack.

## Voraussetzungen

- [GitHub CLI](https://cli.github.com/) (`gh`) - authentifiziert
- [jq](https://jqlang.github.io/jq/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)

```bash
# macOS
brew install gh jq

# gh authentifizieren
gh auth login
```

## Installation

```bash
# Repo klonen
git clone https://github.com/DEIN_USER/gh-tldr.git
cd gh-tldr

# Optional: Symlink in PATH
ln -s "$(pwd)/gh-tldr" /usr/local/bin/gh-tldr
```

## Nutzung

```bash
# Eigene Aktivität (nutzt gh auth user)
./gh-tldr

# Bestimmter User
./gh-tldr yungweng
```

## Output

```
tl;dr 28.12

• 3 PRs erstellt (repo-a, repo-b)
• 5 PRs reviewed/approved (repo-c)
• 2 PRs gemerged (repo-a)
• 1 Issue geschlossen (repo-d)

Repos: org/repo-a, org/repo-b, org/repo-c, org/repo-d

---
Hauptsächlich am Feature X gearbeitet. PR "Add user authentication"
fertiggestellt und gemerged. Mehrere Code Reviews für das Team erledigt,
u.a. für den neuen API-Endpoint.
```

## Anpassungen

- **Prompt anpassen:** Bearbeite `prompt.txt` für anderen Output-Style
- **Zeitraum ändern:** In `fetch-github-activity.sh` den `SINCE` Parameter anpassen
