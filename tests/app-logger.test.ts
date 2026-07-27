import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeAppLogData } from "../apps/geolibre-desktop/src/lib/app-logger";

describe("whole-app logger privacy contract", () => {
  it("keeps bounded operational fields and drops typed or sensitive values", () => {
    assert.deepEqual(
      sanitizeAppLogData({
        action: "project.open",
        mode: "stories",
        count: 4,
        visible: true,
        value: "what the user typed",
        text: "private free-form content",
        query: "state=secret",
        token: "credential",
        email: "person@example.org",
        unknownField: "not allow-listed",
      }),
      {
        action: "project.open",
        mode: "stories",
        count: 4,
        visible: true,
      },
    );
  });

  it("redacts URLs and local home-directory identities from safe summaries", () => {
    const sanitized = sanitizeAppLogData({
      summary:
        "Failed at https://example.org/private?token=secret in /home/amitportal/project",
      errorName: "NetworkError",
    });
    assert.equal(sanitized.errorName, "NetworkError");
    assert.equal(sanitized.summary, "Failed at [url] in /home/[user]/project");
  });
});
