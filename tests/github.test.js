import { listIssues, createGitHubClient } from "../src/github.js";
import {
  test,
  expect,
  jest,
  describe,
  beforeEach,
  afterEach,
} from "@jest/globals";

describe("github", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createGitHubClient", () => {
    test("creates client with token and default base URL", () => {
      process.env.GITHUB_TOKEN = "test-token";
      delete process.env.GITHUB_API_URL;

      const client = createGitHubClient();

      expect(client).toBeDefined();
    });

    test("throws when GITHUB_TOKEN is missing", () => {
      delete process.env.GITHUB_TOKEN;

      expect(() => createGitHubClient()).toThrow(
        "Missing required env var: GITHUB_TOKEN",
      );
    });
  });

  describe("listIssues", () => {
    test("filters out pull requests", async () => {
      const pages = [
        { data: [{ number: 1 }, { number: 2, pull_request: {} }] },
        { data: [{ number: 3 }] },
      ];
      const octokit = {
        issues: { listForRepo: jest.fn() },
        paginate: {
          iterator: jest.fn(async function* () {
            yield* pages;
          }),
        },
      };

      const items = await listIssues(octokit, { owner: "a", repo: "b" });
      expect(items.map((i) => i.number)).toEqual([1, 3]);
    });
  });
});
