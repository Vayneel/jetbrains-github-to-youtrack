import { getEnvVar, getEnvVarOptional, logger } from "./utils.js";
import { createGitHubClient, listIssues } from "./github.js";
import {
  createYouTrackClient,
  createIssue,
  fetchYouTrackTags,
  fetchYouTrackProject,
} from "./youtrack.js";
import { mapGitHubIssueToYouTrack } from "./mapper.js";

export async function main() {
  const owner = getEnvVar("GITHUB_OWNER");
  const repo = getEnvVar("GITHUB_REPO");
  let youtrackProjectId = getEnvVarOptional("YOUTRACK_PROJECT_ID");
  const youtrackProjectShortname = getEnvVarOptional(
    "YOUTRACK_PROJECT_SHORTNAME",
  );

  const octokit = createGitHubClient();
  const youtrack = createYouTrackClient();

  if (!youtrackProjectId) {
    if (!youtrackProjectShortname) {
      throw new Error(
        "Either YOUTRACK_PROJECT_ID or YOUTRACK_PROJECT_SHORTNAME must be provided",
      );
    }

    logger.info(
      `Resolving YouTrack project ID for shortname: ${youtrackProjectShortname}`,
    );
    const project = await fetchYouTrackProject(
      youtrack,
      youtrackProjectShortname,
    );
    youtrackProjectId = project.id;
  }

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
