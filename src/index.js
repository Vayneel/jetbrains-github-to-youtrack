import { getEnvVar, logger } from "./utils.js";
import { createGitHubClient, listIssues } from "./github.js";
import { createYouTrackClient, createIssue } from "./youtrack.js";
import { mapGitHubIssueToYouTrack } from "./mapper.js";

export async function main() {
  const owner = getEnvVar("GITHUB_OWNER");
  const repo = getEnvVar("GITHUB_REPO");
  const youtrackProjectShortName = getEnvVar("YOUTRACK_PROJECT_SHORT_NAME");

  const octokit = createGitHubClient();
  const youtrack = createYouTrackClient();

  const issues = await listIssues(octokit, { owner, repo, state: "all" });

  for (const ghIssue of issues) {
    const yt_issue = mapGitHubIssueToYouTrack(ghIssue);
    await createIssue(youtrack, {
      projectShortName: youtrackProjectShortName,
      summary: yt_issue.summary,
      description: yt_issue.description,
      state: yt_issue.state,
      assigneeLogin: yt_issue.assigneeLogin,
      externalId: yt_issue.externalId,
      tags: yt_issue.tags,
    });
  }

  logger.info("Import complete");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    logger.error(err?.response?.data || err.message || err);
    process.exitCode = 1;
  });
}
