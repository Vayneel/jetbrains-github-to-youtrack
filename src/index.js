import { getRequiredEnv, logger } from "./utils.js";
import { createGitHubClient, listIssues } from "./github.js";
import { createYouTrackClient, createIssue } from "./youtrack.js";
import { mapGitHubIssueToYouTrack } from "./mapper.js";

async function main() {
  const owner = getRequiredEnv("GITHUB_OWNER");
  const repo = getRequiredEnv("GITHUB_REPO");
  const youtrackProjectId = getRequiredEnv("YOUTRACK_PROJECT_ID");

  const octokit = createGitHubClient();
  const youtrack = createYouTrackClient();

  const issues = await listIssues(octokit, { owner, repo, state: "all" });

  for (const ghIssue of issues) {
    const yt = mapGitHubIssueToYouTrack(ghIssue);
    await createIssue(youtrack, {
      projectId: youtrackProjectId,
      summary: yt.summary,
      description: yt.description,
      state: yt.state,
      assigneeLogin: yt.assigneeLogin,
      externalId: yt.externalId,
    });
  }

  logger.info("Import complete");
}

main().catch((err) => {
  logger.error(err?.response?.data || err.message || err);
  process.exitCode = 1;
});
