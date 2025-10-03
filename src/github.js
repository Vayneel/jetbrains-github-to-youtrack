import { Octokit } from "@octokit/rest";
import { getEnvVar, logger } from "./utils.js";

export function createGitHubClient() {
  const token = getRequiredEnv("GITHUB_TOKEN");
  const baseUrl = (
    process.env.GITHUB_API_URL || "https://api.github.com"
  ).trim();
  const octokit = new Octokit({ auth: token, baseUrl });
  return octokit;
}

export async function listIssues(
  octokit,
  { owner, repo, state = "all", perPage = 100 },
) {
  logger.info(`Fetching GitHub issues for ${owner}/${repo} (state=${state})`);
  const issues = [];
  const iterator = octokit.paginate.iterator(octokit.issues.listForRepo, {
    owner,
    repo,
    state,
    per_page: perPage,
  });
  for await (const { data } of iterator) {
    for (const issue of data) {
      if (issue.pull_request) continue; // skip PRs, cuz they are classified as issues under the hood
      issues.push(issue);
    }
  }
  logger.info(`Fetched ${issues.length} issues from GitHub`);
  return issues;
}
