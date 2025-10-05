import express from "express";
import crypto from "crypto";
import { getEnvVar, getEnvVarOptional, logger } from "./utils.js";
import { createGitHubClient, listIssues } from "./github.js";
import {
  createYouTrackClient,
  findIssueByExternalId,
  updateIssueFields,
  createIssue,
  fetchYouTrackTags,
  fetchYouTrackProject,
} from "./youtrack.js";
import { mapGitHubIssueToYouTrack, generateExternalId } from "./mapper.js";

const app = express();
const PORT = getEnvVarOptional("WEBHOOK_PORT") || 3000;
const WEBHOOK_SECRET = getEnvVarOptional("GITHUB_WEBHOOK_SECRET");

// Middleware
app.use(express.json({ limit: "10mb" }));

// Verify GitHub webhook signature
function verifySignature(req, res, next) {
  if (!WEBHOOK_SECRET) {
    logger.warn(
      "No webhook secret configured, skipping signature verification",
    );
    return next();
  }

  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    logger.warn("No signature found in webhook request");
    return res.status(401).json({ error: "Missing signature" });
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex")}`;

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  ) {
    logger.warn("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
}

// Initialize clients and fetch all issues from GitHub
let youtrackClient;
let youtrackProjectId;
let youtrackTags;
let githubClient;

async function initializeClients() {
  try {
    const owner = getEnvVar("GITHUB_OWNER");
    const repo = getEnvVar("GITHUB_REPO");
    let projectId = getEnvVarOptional("YOUTRACK_PROJECT_ID");
    const projectShortname = getEnvVarOptional("YOUTRACK_PROJECT_SHORTNAME");

    githubClient = createGitHubClient();
    youtrackClient = createYouTrackClient();

    // Resolve YouTrack project ID if not provided
    if (!projectId) {
      if (!projectShortname) {
        throw new Error(
          "Either YOUTRACK_PROJECT_ID or YOUTRACK_PROJECT_SHORTNAME must be provided",
        );
      }

      logger.info(
        `Resolving YouTrack project ID for shortname: ${projectShortname}`,
      );
      const project = await fetchYouTrackProject(
        youtrackClient,
        projectShortname,
      );
      projectId = project.id;
    }

    youtrackProjectId = projectId;
    youtrackTags = await fetchYouTrackTags(youtrackClient);

    logger.info(`Webhook server initialized for ${owner}/${repo}`);
    logger.info(`YouTrack project ID: ${youtrackProjectId}`);

    // Import all GitHub issues at startup
    await importAllGitHubIssues(owner, repo);
  } catch (error) {
    logger.error("Failed to initialize clients:", error.message);
    process.exit(1);
  }
}

// Import or update all GitHub issues in YouTrack
async function importAllGitHubIssues(owner, repo) {
  logger.info("Fetching all GitHub issues for initial import...");
  const issues = await listIssues(githubClient, { owner, repo });

  logger.info(`Starting YouTrack sync for ${issues.length} GitHub issues...`);

  for (const issue of issues) {
    const externalId = generateExternalId(issue);

    try {
      const existingIssue = await findIssueByExternalId(
        youtrackClient,
        externalId,
      );
      const mappedIssue = mapGitHubIssueToYouTrack(issue, youtrackTags);

      if (existingIssue) {
        // Update existing issue in YouTrack
        await updateIssueFields(youtrackClient, existingIssue.id, {
          summary: mappedIssue.summary,
          description: mappedIssue.description,
          state: mappedIssue.state,
          assigneeLogin: mappedIssue.assigneeLogin,
          tagIds: mappedIssue.tagIds,
        });
        logger.info(`Updated YouTrack issue for GitHub #${issue.number}`);
      } else {
        // Create new issue in YouTrack
        await createIssue(youtrackClient, {
          projectId: youtrackProjectId,
          summary: mappedIssue.summary,
          description: mappedIssue.description,
          state: mappedIssue.state,
          assigneeLogin: mappedIssue.assigneeLogin,
          externalId: mappedIssue.externalId,
          tagIds: mappedIssue.tagIds,
        });
        logger.info(`Created new YouTrack issue for GitHub #${issue.number}`);
      }
    } catch (err) {
      logger.error(
        `Failed to sync GitHub issue #${issue.number}: ${err.message}`,
      );
    }
  }

  logger.info("Completed initial GitHub -> YouTrack import");
}

// Handle GitHub issue events
async function handleIssueEvent(event, payload) {
  const { action, issue } = payload;

  if (!issue) {
    logger.warn("No issue data in webhook payload");
    return;
  }

  const externalId = generateExternalId(issue);
  logger.info(`Processing GitHub issue ${issue.number} - Action: ${action}`);

  try {
    const existingIssue = await findIssueByExternalId(
      youtrackClient,
      externalId,
    );
    const mappedIssue = mapGitHubIssueToYouTrack(issue, youtrackTags);

    if (existingIssue) {
      await updateIssueFields(youtrackClient, existingIssue.id, mappedIssue);
      logger.info(`Updated YouTrack issue for GitHub #${issue.number}`);
    } else {
      await createIssue(youtrackClient, {
        projectId: youtrackProjectId,
        ...mappedIssue,
      });
      logger.info(`Created new YouTrack issue for GitHub #${issue.number}`);
    }
  } catch (error) {
    logger.error(
      `Failed to sync GitHub issue #${issue.number}: ${error.message}`,
    );
    throw error;
  }
}

// Webhook endpoint
app.post("/webhook", verifySignature, async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    logger.info(`Received GitHub webhook: ${event}`);

    switch (event) {
      case "issues":
        await handleIssueEvent(event, payload);
        break;
      default:
        logger.info(`Ignoring webhook event: ${event}`);
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("Webhook processing failed:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    youtrackProjectId,
  });
});

async function startServer() {
  await initializeClients();

  app.listen(PORT, () => {
    logger.info(`GitHub webhook server running on port ${PORT}`);
    logger.info(`Webhook endpoint: http://localhost:${PORT}/webhook`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    logger.error("Failed to start webhook server:", err.message);
    process.exit(1);
  });
}
