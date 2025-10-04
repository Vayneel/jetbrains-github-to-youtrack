import { getEnvVar, logger } from "./utils.js";
import { createGitHubClient, listIssues } from "./github.js";
import {
  createYouTrackClient,
  createIssue,
  fetchYouTrackTags,
} from "./youtrack.js";
import { mapGitHubIssueToYouTrack } from "./mapper.js";

export async function main() {
  const owner = getEnvVar("GITHUB_OWNER");
  const repo = getEnvVar("GITHUB_REPO");
  const youtrackProjectId = getEnvVar("YOUTRACK_PROJECT_ID");

  const octokit = createGitHubClient();
  const youtrack = createYouTrackClient();

  const issues = await listIssues(octokit, { owner, repo, state: "all" });
  const youtrackTags = await fetchYouTrackTags(youtrack);

  for (const ghIssue of issues) {
    const yt_issue = mapGitHubIssueToYouTrack(ghIssue, youtrackTags);
    await createIssue(youtrack, {
      projectId: youtrackProjectId,
      summary: yt_issue.summary,
      description: yt_issue.description,
      state: yt_issue.state,
      assigneeLogin: yt_issue.assigneeLogin,
      externalId: yt_issue.externalId,
      tagIds: yt_issue.tagIds,
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
