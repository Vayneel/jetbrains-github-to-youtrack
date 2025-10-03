import axios from "axios";
import { getEnvVar, logger } from "./utils.js";

export function createYouTrackClient() {
  const baseUrl = getRequiredEnv("YOUTRACK_BASE_URL").replace(/\/$/, "");
  const token = getRequiredEnv("YOUTRACK_TOKEN");
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

export async function createIssue(
  http,
  { projectId, summary, description, state, assigneeLogin, externalId },
) {
  const fields = [
    { name: "summary", $type: "SimpleIssueCustomField", value: summary },
  ];
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
  };

  const params = { fields: "id,idReadable,summary" };
  const { data } = await http.post("/issues", payload, { params });
  logger.info("Created YouTrack issue", data.idReadable);
  return data;
}

export async function updateIssue(http, issueId, patch) {
  const params = { fields: "id,idReadable,summary" };
  const { data } = await http.post(`/issues/${issueId}`, patch, { params });
  logger.info("Updated YouTrack issue", data.idReadable);
  return data;
}
