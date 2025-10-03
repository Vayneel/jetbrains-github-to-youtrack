export function mapGitHubIssueToYouTrack(issue) {
  const summary = issue.title || `GH#${issue.number}`;
  const description = buildDescription(issue);
  const state = mapState(issue.state, issue.state_reason);
  const assigneeLogin = issue.assignee?.login || undefined;
  const externalId = `github:${issue.repository_url?.split("/").slice(-2).join("/") || ""}#${issue.number}`;
  const tags = mapLabelsToTags(issue.labels);
  return { summary, description, state, assigneeLogin, externalId, tags };
}

function mapState(ghState, ghReason) {
  if (ghState === "open") return "Open";
  if (ghState === "closed") {
    if (ghReason === "not_planned") return "Won't fix";
    if (ghReason === "reopened") return "Open";
    return "Done";
  }
  return undefined;
}

function buildDescription(issue) {
  const lines = [];
  lines.push(`Imported from GitHub issue #${issue.number}`);
  lines.push("");
  if (issue.user?.login) lines.push(`Author: @${issue.user.login}`);
  if (Array.isArray(issue.labels) && issue.labels.length > 0) {
    const labels = issue.labels
      .map((l) => (typeof l === "string" ? l : l.name))
      .filter(Boolean);
    if (labels.length) lines.push(`Labels: ${labels.join(", ")}`);
  }
  lines.push("");
  if (issue.body) lines.push(issue.body);
  return lines.join("\n");
}

function mapLabelsToTags(labels) {
  if (!Array.isArray(labels)) return [];
  const names = labels
    .map((l) => (typeof l === "string" ? l : l?.name))
    .filter(Boolean);
  return Array.from(new Set(names)); // only unique tags
}
