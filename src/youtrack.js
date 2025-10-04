import axios from "axios";
import { getEnvVar, logger } from "./utils.js";

export function createYouTrackClient() {
  const baseUrl = getEnvVar("YOUTRACK_BASE_URL").replace(/\/$/, "");
  const token = getEnvVar("YOUTRACK_TOKEN");
  const http = axios.create({
    baseURL: `${baseUrl}/api`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  return http;
}

export async function fetchYouTrackTags(http) {
  try {
    const { data } = await http.get("/tags", {
      params: { fields: "id,name" },
    });
    return data;
  } catch (error) {
    logger.warn("Failed to fetch YouTrack tags:", error.message);
    return [];
  }
}

export async function createIssue(
  http,
  {
    projectId,
    summary,
    description,
    state,
    assigneeLogin,
    externalId,
    tagIds = [],
  },
) {
  const fields = [];
  if (state) {
    fields.push({
      name: "State",
      $type: "StateIssueCustomField",
      value: { name: state },
    });
  }
  if (assigneeLogin) {
    fields.push({
      name: "Assignee",
      $type: "SingleUserIssueCustomField",
      value: { login: assigneeLogin },
    });
  }

  const payload = {
    project: { id: projectId },
    summary,
    description,
    customFields: fields,
    ...(externalId ? { externalIssue: { id: externalId } } : {}),
    ...(tagIds.length ? { tags: tagIds.map((id) => ({ id })) } : {}),
  };

  const params = { fields: "id,idReadable,summary" };

  try {
    const { data } = await http.post("/issues", payload, { params });
    logger.info("Created YouTrack issue", data.idReadable);
    return data;
  } catch (error) {
    // If assignee is invalid, try without assignee
    if (
      assigneeLogin &&
      error.response?.data?.error_description?.includes("No user for login")
    ) {
      logger.warn(
        `User ${assigneeLogin} not found in YouTrack, creating issue without assignee`,
      );
      const payloadWithoutAssignee = {
        ...payload,
        customFields: fields.filter((field) => field.name !== "Assignee"),
      };
      const { data } = await http.post("/issues", payloadWithoutAssignee, {
        params,
      });
      logger.info("Created YouTrack issue", data.idReadable);
      return data;
    }
    throw error;
  }
}

export async function updateIssue(http, issueId, patch) {
  const params = { fields: "id,idReadable,summary" };
  const { data } = await http.post(`/issues/${issueId}`, patch, { params });
  logger.info("Updated YouTrack issue", data.idReadable);
  return data;
}
