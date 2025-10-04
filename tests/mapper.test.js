import { mapGitHubIssueToYouTrack } from "../src/mapper.js";
import { test, expect, describe } from "@jest/globals";

describe("mapper", () => {
  describe("mapGitHubIssueToYouTrack", () => {
    test("maps basic fields and tags", () => {
      const gh = {
        number: 42,
        title: "Add feature",
        state: "open",
        labels: [{ name: "bug" }, { name: "good first issue" }],
        repository_url: "https://api.github.com/repos/acme/app",
        body: "Detailed description",
        user: { login: "octocat" },
      };
      const youtrackTags = [
        { id: "tag1", name: "bug" },
        { id: "tag2", name: "good first issue" },
      ];

      const yt = mapGitHubIssueToYouTrack(gh, youtrackTags);

      expect(yt.summary).toBe("Add feature");
      expect(yt.state).toBe("Open");
      expect(yt.externalId).toBe("github:acme/app#42");
      expect(yt.tagIds).toEqual(["tag1", "tag2"]);
      expect(yt.description).toMatch("Imported from GitHub issue #42");
    });

    test("maps closed reason not_planned to Won't fix", () => {
      const gh = {
        number: 1,
        title: "X",
        state: "closed",
        state_reason: "not_planned",
        repository_url: "https://api.github.com/repos/acme/app",
      };
      const yt = mapGitHubIssueToYouTrack(gh);
      expect(yt.state).toBe("Won't fix");
    });

    test("maps closed reason completed to Done", () => {
      const gh = {
        number: 1,
        title: "X",
        state: "closed",
        state_reason: "completed",
        repository_url: "https://api.github.com/repos/acme/app",
      };
      const yt = mapGitHubIssueToYouTrack(gh);
      expect(yt.state).toBe("Done");
    });

    test("handles case-insensitive tag matching", () => {
      const gh = {
        number: 42,
        title: "Test",
        state: "open",
        labels: ["BUG", "Feature"],
        repository_url: "https://api.github.com/repos/acme/app",
      };
      const youtrackTags = [
        { id: "tag1", name: "bug" },
        { id: "tag2", name: "feature" },
      ];

      const yt = mapGitHubIssueToYouTrack(gh, youtrackTags);

      expect(yt.tagIds).toEqual(["tag1", "tag2"]);
    });

    test("handles missing repository_url", () => {
      const gh = {
        number: 42,
        title: "Test",
        state: "open",
      };

      const yt = mapGitHubIssueToYouTrack(gh);

      expect(yt.externalId).toBe("github:#42");
    });
  });
});
