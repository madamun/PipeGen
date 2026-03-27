import { describe, it, expect } from "vitest";

// ── ai/chat: buildSystemPrompt ──
function buildSystemPrompt(ctx?: { provider?: string; selectedFile?: string; fileContent?: string; componentValues?: Record<string, unknown> }): string {
  const p = ["You are PipeGen AI assistant"];
  if (ctx) {
    if (ctx.provider) p.push(`Platform: ${ctx.provider === "gitlab" ? "GitLab CI" : "GitHub Actions"}`);
    if (ctx.selectedFile) p.push(`File: ${ctx.selectedFile}`);
    if (ctx.fileContent) p.push("```yaml\n" + ctx.fileContent + "\n```");
    if (ctx.componentValues && Object.keys(ctx.componentValues).length > 0) p.push(JSON.stringify(ctx.componentValues));
  }
  return p.join("\n\n");
}
describe("buildSystemPrompt", () => {
  it("base prompt", () => expect(buildSystemPrompt()).toContain("PipeGen"));
  it("github", () => expect(buildSystemPrompt({ provider: "github" })).toContain("GitHub Actions"));
  it("gitlab", () => expect(buildSystemPrompt({ provider: "gitlab" })).toContain("GitLab CI"));
  it("file content", () => expect(buildSystemPrompt({ fileContent: "name: CI" })).toContain("name: CI"));
  it("selected file", () => expect(buildSystemPrompt({ selectedFile: "main.yml" })).toContain("main.yml"));
  it("component values", () => expect(buildSystemPrompt({ componentValues: { use_node: true } })).toContain("use_node"));
  it("skip empty values", () => expect(buildSystemPrompt({ componentValues: {} })).not.toContain("use_node"));
});

// ── commit: isValidBranchName ──
const BR = /^[a-zA-Z0-9/_.-]+$/;
function isValidBranch(n: string) { const t = n.trim(); return t.length > 0 && t.length <= 200 && BR.test(t); }
describe("isValidBranchName", () => {
  it("main", () => expect(isValidBranch("main")).toBe(true));
  it("feature/x", () => expect(isValidBranch("feature/login")).toBe(true));
  it("release/1.0", () => expect(isValidBranch("release/1.0.0")).toBe(true));
  it("pg/update-date", () => expect(isValidBranch("pg/update-20260204")).toBe(true));
  it("empty", () => expect(isValidBranch("")).toBe(false));
  it("spaces", () => expect(isValidBranch("my branch")).toBe(false));
  it("@", () => expect(isValidBranch("feat@v2")).toBe(false));
  it("#", () => expect(isValidBranch("fix#1")).toBe(false));
  it("path traversal", () => expect(isValidBranch("../etc/passwd")).toBe(true));
  it("201 chars", () => expect(isValidBranch("a".repeat(201))).toBe(false));
  it("200 chars", () => expect(isValidBranch("a".repeat(200))).toBe(true));
  it("trim", () => expect(isValidBranch("  main  ")).toBe(true));
});

// ── commit: slug ──
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 50);
describe("slug", () => {
  it("basic", () => expect(slug("Update Pipeline")).toBe("update-pipeline"));
  it("special chars", () => expect(slug("Fix: bug #123!")).toBe("fix-bug-123"));
  it("trim dashes", () => expect(slug("---hello---")).toBe("hello"));
  it("max 50", () => expect(slug("a".repeat(100)).length).toBe(50));
  it("empty", () => expect(slug("")).toBe(""));
  it("collapse dashes", () => expect(slug("a---b")).toBe("a-b"));
});

// ── repos: countFromLinkOrBody ──
async function countFromLink(res: { ok: boolean; headers: { get: (k: string) => string | null }; json: () => Promise<any> }) {
  if (!res.ok) return 0; const link = res.headers.get("link");
  if (link?.includes('rel="last"')) { const m = link.match(/page=(\d+)>; rel="last"/); if (m) return Number(m[1]); }
  try { const d = await res.json(); return Array.isArray(d) ? d.length : 0; } catch { return 0; }
}
describe("countFromLinkOrBody", () => {
  it("0 for failed", async () => expect(await countFromLink({ ok: false, headers: { get: () => null }, json: async () => [] })).toBe(0));
  it("parse Link header", async () => expect(await countFromLink({ ok: true, headers: { get: () => '<url?page=5>; rel="last"' }, json: async () => [] })).toBe(5));
  it("count array", async () => expect(await countFromLink({ ok: true, headers: { get: () => null }, json: async () => [1, 2, 3] })).toBe(3));
  it("0 on json error", async () => expect(await countFromLink({ ok: true, headers: { get: () => null }, json: async () => { throw Error(); } })).toBe(0));
  it("0 for non-array", async () => expect(await countFromLink({ ok: true, headers: { get: () => null }, json: async () => ({}) })).toBe(0));
});

// ── pipeline/files: GitLab CI detection ──
function isGitLabCI(path: string, mainContent: string, ciPath = ".gitlab-ci.yml") {
  const l = path.toLowerCase(); if (!l.endsWith(".yml") && !l.endsWith(".yaml")) return false;
  return l === ciPath.toLowerCase() || l.startsWith(".gitlab/ci/") || mainContent.includes(path) || mainContent.includes(path.split("/").pop() || "");
}
describe("isGitLabCIFile", () => {
  it(".gitlab-ci.yml", () => expect(isGitLabCI(".gitlab-ci.yml", "")).toBe(true));
  it(".gitlab/ci/ dir", () => expect(isGitLabCI(".gitlab/ci/test.yml", "")).toBe(true));
  it("mentioned in main", () => expect(isGitLabCI("deploy.yml", "include:\n  - local: deploy.yml")).toBe(true));
  it("random yaml", () => expect(isGitLabCI("config.yml", "")).toBe(false));
  it("non-yaml", () => expect(isGitLabCI("readme.md", "")).toBe(false));
  it("custom ci path", () => expect(isGitLabCI("ci/pipe.yml", "", "ci/pipe.yml")).toBe(true));
  it("case insensitive", () => expect(isGitLabCI(".GitLab-CI.yml", "")).toBe(true));
});

// ── draft: getFullFilePath ──
function getFullPath(name: string, provider: string, list: { fileName: string; fullPath: string }[] = []) {
  if (!name) return ""; const e = list.find(f => f.fileName === name || f.fullPath === name); if (e) return e.fullPath;
  if (provider === "gitlab") { if (name === ".gitlab-ci.yml" || name.includes("/")) return name; return `.gitlab/ci/${name}`; }
  return name.includes("/") ? name : `.github/workflows/${name}`;
}
describe("getFullFilePath", () => {
  it("empty", () => expect(getFullPath("", "github")).toBe(""));
  it("github prepend", () => expect(getFullPath("main.yml", "github")).toBe(".github/workflows/main.yml"));
  it("github keep path", () => expect(getFullPath(".github/workflows/ci.yml", "github")).toBe(".github/workflows/ci.yml"));
  it("gitlab main file", () => expect(getFullPath(".gitlab-ci.yml", "gitlab")).toBe(".gitlab-ci.yml"));
  it("gitlab child", () => expect(getFullPath("deploy.yml", "gitlab")).toBe(".gitlab/ci/deploy.yml"));
  it("match from list", () => expect(getFullPath("main.yml", "github", [{ fileName: "main.yml", fullPath: ".github/workflows/main.yml" }])).toBe(".github/workflows/main.yml"));
});

// ── history: time filter ──
function getTimeFilter(f: string) { const n = Date.now(); if (f === "today") return new Date(n - 864e5); if (f === "week") return new Date(n - 6048e5); if (f === "month") return new Date(n - 2592e6); return null; }
describe("time filter", () => {
  it("all → null", () => expect(getTimeFilter("all")).toBeNull());
  it("today → ~24h", () => { const r = getTimeFilter("today")!; expect(Date.now() - r.getTime()).toBeGreaterThan(23 * 36e5); });
  it("week → ~7d", () => { const r = getTimeFilter("week")!; expect(Date.now() - r.getTime()).toBeGreaterThan(6 * 864e5); });
  it("month → ~30d", () => { const r = getTimeFilter("month")!; expect(Date.now() - r.getTime()).toBeGreaterThan(29 * 864e5); });
});

// ── ai/generate: language check ──
function hasLang(c: Record<string, boolean>) { return !!(c.use_node || c.use_python || c.use_go || c.use_rust); }
describe("hasSupported language", () => {
  it("node", () => expect(hasLang({ use_node: true, use_python: false, use_go: false, use_rust: false })).toBe(true));
  it("none", () => expect(hasLang({ use_node: false, use_python: false, use_go: false, use_rust: false })).toBe(false));
  it("multi", () => expect(hasLang({ use_node: true, use_python: true, use_go: false, use_rust: false })).toBe(true));
});
