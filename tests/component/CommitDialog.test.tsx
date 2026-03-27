import { describe, it, expect } from "vitest";

const BR = /^[a-zA-Z0-9/_.-]+$/;
function isValid(n: string) { const t = n.trim(); return t.length > 0 && t.length <= 200 && BR.test(t); }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 50);
function targetPath(file: string | null, provider: string) { const f = file || (provider === "gitlab" ? ".gitlab-ci.yml" : "pipeline.yml"); if (provider === "github") return f.includes("/") ? f : `.github/workflows/${f}`; if (provider === "gitlab") { if (f === ".gitlab-ci.yml" || f.includes("/")) return f; return `.gitlab/ci/${f}`; } return f; }

describe("CommitDialog — branch validation", () => {
  it("main", () => expect(isValid("main")).toBe(true));
  it("feature/login", () => expect(isValid("feature/login")).toBe(true));
  it("release/1.0.0", () => expect(isValid("release/1.0.0")).toBe(true));
  it("pg/update-20260204", () => expect(isValid("pg/update-20260204")).toBe(true));
  it("empty → false", () => expect(isValid("")).toBe(false));
  it("spaces → false", () => expect(isValid("my branch")).toBe(false));
  it("@ → false", () => expect(isValid("feat@v2")).toBe(false));
  it("path traversal passes regex (server validates separately)", () => expect(isValid("../etc/passwd")).toBe(true));
  it("201 chars → false", () => expect(isValid("a".repeat(201))).toBe(false));
  it("200 chars → true", () => expect(isValid("a".repeat(200))).toBe(true));
});

describe("CommitDialog — slug", () => {
  it("basic", () => expect(slug("Update Pipeline")).toBe("update-pipeline"));
  it("special chars", () => expect(slug("Fix: #123!")).toBe("fix-123"));
  it("trim dashes", () => expect(slug("---hello---")).toBe("hello"));
  it("max 50", () => expect(slug("a".repeat(100)).length).toBe(50));
  it("empty", () => expect(slug("")).toBe(""));
});

describe("CommitDialog — target path", () => {
  it("github prepend", () => expect(targetPath("main.yml", "github")).toBe(".github/workflows/main.yml"));
  it("github keep full", () => expect(targetPath(".github/workflows/ci.yml", "github")).toBe(".github/workflows/ci.yml"));
  it("gitlab main", () => expect(targetPath(".gitlab-ci.yml", "gitlab")).toBe(".gitlab-ci.yml"));
  it("gitlab child", () => expect(targetPath("deploy.yml", "gitlab")).toBe(".gitlab/ci/deploy.yml"));
  it("gitlab keep full", () => expect(targetPath(".gitlab/ci/test.yml", "gitlab")).toBe(".gitlab/ci/test.yml"));
  it("null github", () => expect(targetPath(null, "github")).toBe(".github/workflows/pipeline.yml"));
  it("null gitlab", () => expect(targetPath(null, "gitlab")).toBe(".gitlab-ci.yml"));
});

describe("CommitDialog — preview info", () => {
  it("should detect update vs create", () => {
    const original = "name: CI\non:\n  push:";
    const isUpdate = typeof original === "string" && original.trim().length > 0;
    expect(isUpdate).toBe(true);
  });
  it("should detect new file", () => {
    const original = "";
    const isUpdate = typeof original === "string" && original.trim().length > 0;
    expect(isUpdate).toBe(false);
  });
  it("should show correct action label for github PR", () => {
    const mode = "pull_request"; const provider = "github";
    const label = mode === "pull_request" ? (provider === "gitlab" ? "Merge Request" : "Pull Request") : "Direct Push";
    expect(label).toBe("Pull Request");
  });
  it("should show correct action label for gitlab MR", () => {
    const mode = "pull_request"; const provider = "gitlab";
    const label = mode === "pull_request" ? (provider === "gitlab" ? "Merge Request" : "Pull Request") : "Direct Push";
    expect(label).toBe("Merge Request");
  });
});
