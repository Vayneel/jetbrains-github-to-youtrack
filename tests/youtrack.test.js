import {
  createYouTrackClient,
  fetchYouTrackTags,
  fetchYouTrackProject,
  createIssue,
} from "../src/youtrack.js";
import {
  test,
  expect,
  jest,
  describe,
  beforeEach,
  afterEach,
} from "@jest/globals";

describe("youtrack", () => {
  const originalEnv = process.env;
  const originalConsole = { ...console };

  beforeEach(() => {
    process.env = { ...originalEnv };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("createYouTrackClient", () => {
    test("creates client with base URL and token", () => {
      process.env.YOUTRACK_BASE_URL = "https://yt.example.com";
      process.env.YOUTRACK_TOKEN = "test-token";

      const client = createYouTrackClient();

      expect(client.defaults.baseURL).toBe("https://yt.example.com/api");
      expect(client.defaults.headers.Authorization).toBe("Bearer test-token");
    });

    test("throws when required env vars missing", () => {
      delete process.env.YOUTRACK_BASE_URL;
      process.env.YOUTRACK_TOKEN = "test-token";

      expect(() => createYouTrackClient()).toThrow(
        "Missing required env var: YOUTRACK_BASE_URL",
      );
    });
  });

  describe("fetchYouTrackTags", () => {
    test("returns empty array on error", async () => {
      const mockHttp = {
        get: jest.fn().mockRejectedValue(new Error("Network error")),
      };

      const result = await fetchYouTrackTags(mockHttp);

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        "[WARN]",
        "Failed to fetch YouTrack tags:",
        "Network error",
      );
    });
  });

  describe("fetchYouTrackProject", () => {
    test("throws error on failure", async () => {
      const mockHttp = {
        get: jest.fn().mockRejectedValue(new Error("Project not found")),
      };

      await expect(fetchYouTrackProject(mockHttp, "INVALID")).rejects.toThrow(
        "Project not found",
      );
      expect(console.error).toHaveBeenCalledWith(
        "[ERROR]",
        "Failed to fetch YouTrack project:",
        "Project not found",
      );
    });
  });

  describe("createIssue", () => {
    test("retries without assignee when user not found", async () => {
      const mockHttp = {
        post: jest
          .fn()
          .mockRejectedValueOnce({
            response: {
              data: {
                error_description: "No user for login: invaliduser",
              },
            },
          })
          .mockResolvedValueOnce({
            data: {
              id: "issue-123",
              idReadable: "APP-1",
              summary: "Test Issue",
            },
          }),
      };

      const result = await createIssue(mockHttp, {
        projectId: "project-123",
        summary: "Test Issue",
        description: "Test description",
        assigneeLogin: "invaliduser",
      });

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(
        "[WARN]",
        "User invaliduser not found in YouTrack, creating issue without assignee",
      );
      expect(result).toEqual({
        id: "issue-123",
        idReadable: "APP-1",
        summary: "Test Issue",
      });
    });
  });
});
