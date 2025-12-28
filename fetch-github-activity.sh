#!/bin/bash
# Fetches GitHub activity for a user in the last 24 hours
# Outputs JSON with all relevant data for Claude to summarize

set -e

# Get username from gh cli if not provided
USERNAME="${1:-$(gh api user --jq '.login')}"
SINCE=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")
TODAY=$(date +"%d.%m.%Y")

echo "Fetching GitHub activity for $USERNAME since $SINCE..." >&2

# Fetch PRs created by user
echo "Fetching PRs created..." >&2
PRS_CREATED=$(gh api -X GET "search/issues" \
  -f q="author:$USERNAME type:pr created:>=$SINCE" \
  -f per_page=100 \
  --jq '.items | map({
    repo: (.repository_url | split("/") | .[-1]),
    org: (.repository_url | split("/") | .[-2]),
    title: .title,
    number: .number,
    state: .state,
    url: .html_url
  })')

# Fetch PRs merged by user (as author)
echo "Fetching PRs merged..." >&2
PRS_MERGED=$(gh api -X GET "search/issues" \
  -f q="author:$USERNAME type:pr merged:>=$SINCE" \
  -f per_page=100 \
  --jq '.items | map({
    repo: (.repository_url | split("/") | .[-1]),
    org: (.repository_url | split("/") | .[-2]),
    title: .title,
    number: .number,
    url: .html_url
  })')

# Fetch PR reviews by user
echo "Fetching PR reviews..." >&2
PRS_REVIEWED=$(gh api -X GET "search/issues" \
  -f q="reviewed-by:$USERNAME type:pr updated:>=$SINCE -author:$USERNAME" \
  -f per_page=100 \
  --jq '.items | map({
    repo: (.repository_url | split("/") | .[-1]),
    org: (.repository_url | split("/") | .[-2]),
    title: .title,
    number: .number,
    url: .html_url
  })')

# Fetch issues created by user
echo "Fetching issues created..." >&2
ISSUES_CREATED=$(gh api -X GET "search/issues" \
  -f q="author:$USERNAME type:issue created:>=$SINCE" \
  -f per_page=100 \
  --jq '.items | map({
    repo: (.repository_url | split("/") | .[-1]),
    org: (.repository_url | split("/") | .[-2]),
    title: .title,
    number: .number,
    url: .html_url
  })')

# Fetch issues closed by user (author OR assignee)
echo "Fetching issues closed..." >&2
ISSUES_CLOSED=$(gh api -X GET "search/issues" \
  -f q="involves:$USERNAME type:issue closed:>=$SINCE" \
  -f per_page=100 \
  --jq '.items | map({
    repo: (.repository_url | split("/") | .[-1]),
    org: (.repository_url | split("/") | .[-2]),
    title: .title,
    number: .number,
    url: .html_url
  })')

# Fetch commits by user
echo "Fetching commits..." >&2
COMMITS=$(gh api -X GET "search/commits" \
  -f q="author:$USERNAME committer-date:>=$SINCE" \
  -f per_page=100 \
  --jq '.items | map({
    repo: .repository.name,
    org: .repository.owner.login,
    message: (.commit.message | split("\n")[0]),
    url: .html_url
  })')

# Extract new repos from commits with "initial/init/first" anywhere in message
REPOS_CREATED=$(echo "$COMMITS" | jq '[.[] | select(.message | ascii_downcase | test("initial|^init |first commit")) | {name: .repo, org: .org}] | unique')

# Combine all data and extract unique repos
ALL_REPOS=$(echo "$PRS_CREATED $PRS_MERGED $PRS_REVIEWED $ISSUES_CREATED $ISSUES_CLOSED $COMMITS" | \
  jq -s 'add | map(.org + "/" + .repo) | unique')

# Build final JSON
jq -n \
  --arg user "$USERNAME" \
  --arg date "$TODAY" \
  --arg period "letzte 24 Stunden" \
  --argjson prs_created "$PRS_CREATED" \
  --argjson prs_merged "$PRS_MERGED" \
  --argjson prs_reviewed "$PRS_REVIEWED" \
  --argjson issues_created "$ISSUES_CREATED" \
  --argjson issues_closed "$ISSUES_CLOSED" \
  --argjson commits "$COMMITS" \
  --argjson repos_created "$REPOS_CREATED" \
  --argjson repos "$ALL_REPOS" \
  '{
    user: $user,
    date: $date,
    period: $period,
    prs_created: $prs_created,
    prs_merged: $prs_merged,
    prs_reviewed: $prs_reviewed,
    issues_created: $issues_created,
    issues_closed: $issues_closed,
    commits: $commits,
    repos_created: $repos_created,
    repos_touched: $repos
  }'
