import type { GitHubActivity, OutputFormat, Language } from "./types.js";

function getRepoNames(items: { repo: string }[]): string {
  const repos = [...new Set(items.map((i) => i.repo))];
  return repos.join(", ");
}

function formatActivityLine(
  count: number,
  labelEn: string,
  labelDe: string,
  repos: string,
  lang: Language,
  format: OutputFormat
): string | null {
  if (count === 0) return null;

  const label = lang === "en" ? labelEn : labelDe;
  const repoSuffix = repos ? ` (${repos})` : "";

  switch (format) {
    case "markdown":
      return `- **${count}** ${label}${repoSuffix}`;
    case "plain":
      return `• ${count} ${label}${repoSuffix}`;
    case "slack":
    default:
      return `• ${count} ${label}${repoSuffix}`;
  }
}

export function formatActivity(
  activity: GitHubActivity,
  format: OutputFormat,
  lang: Language
): string {
  const lines: string[] = [];

  // Header
  const headerPrefix = format === "markdown" ? "## " : "";
  lines.push(`${headerPrefix}tl;dr ${activity.date}`);
  lines.push("");

  const activityLines = [
    formatActivityLine(
      activity.prs_created.length,
      "PRs created",
      "PRs erstellt",
      getRepoNames(activity.prs_created),
      lang,
      format
    ),
    formatActivityLine(
      activity.prs_reviewed.length,
      "PRs reviewed",
      "PRs reviewed/approved",
      getRepoNames(activity.prs_reviewed),
      lang,
      format
    ),
    formatActivityLine(
      activity.prs_merged.length,
      "PRs merged",
      "PRs gemerged",
      getRepoNames(activity.prs_merged),
      lang,
      format
    ),
    formatActivityLine(
      activity.issues_created.length,
      "issues created",
      "Issues erstellt",
      getRepoNames(activity.issues_created),
      lang,
      format
    ),
    formatActivityLine(
      activity.issues_closed.length,
      "issues closed",
      "Issues geschlossen",
      getRepoNames(activity.issues_closed),
      lang,
      format
    ),
    formatActivityLine(
      activity.commits.length,
      "commits",
      "Commits",
      getRepoNames(activity.commits),
      lang,
      format
    ),
    formatActivityLine(
      activity.repos_created.length,
      "new repos created",
      "neue Repos erstellt",
      activity.repos_created.map((r) => r.name).join(", "),
      lang,
      format
    ),
  ].filter(Boolean) as string[];

  if (activityLines.length === 0) {
    const noActivity =
      lang === "en"
        ? `No GitHub activity in the ${activity.period}.`
        : `Keine GitHub-Aktivität in den ${activity.period}.`;
    lines.push(noActivity);
    return lines.join("\n");
  }

  lines.push(...activityLines);
  lines.push("");

  // Repos touched
  if (activity.repos_touched.length > 0) {
    const reposLabel = lang === "en" ? "Repos" : "Repos";
    lines.push(`${reposLabel}: ${activity.repos_touched.join(", ")}`);
  }

  return lines.join("\n");
}

export function hasActivity(activity: GitHubActivity): boolean {
  return (
    activity.prs_created.length +
      activity.prs_merged.length +
      activity.prs_reviewed.length +
      activity.issues_created.length +
      activity.issues_closed.length >
    0
  );
}
