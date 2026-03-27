import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeRepo, type AnalyzeRepoParams } from "../../packages/server/pipelineAnalyzer";
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const base: AnalyzeRepoParams = { repoFullName: "test/repo", branch: "main", provider: "github", accessToken: "tok" };
function mock(files: Record<string, string | null>) {
  mockFetch.mockImplementation(async (url: string) => {
    for (const [f, c] of Object.entries(files)) { if (url.includes(encodeURIComponent(f)) || url.includes(f)) return c !== null ? { ok: true, text: async () => c } : { ok: false, text: async () => "" }; }
    return { ok: false, text: async () => "" };
  });
}
beforeEach(() => vi.clearAllMocks());

describe("analyzeRepo", () => {
  it("default config when no files", async () => { mockFetch.mockResolvedValue({ ok: false, text: async () => "" }); const c = await analyzeRepo(base); expect(c.use_node).toBe(false); expect(c.enable_push).toBe(true); });
  it("detect Node from package.json", async () => { mock({ "package.json": JSON.stringify({ scripts: { test: "jest", build: "next build" }, dependencies: { next: "14" } }), Dockerfile: null, "requirements.txt": null, "go.mod": null, "Cargo.toml": null, ".eslintrc.js": null, "eslint.config.js": null, "eslint.config.mjs": null, "eslint.config.cjs": null, ".eslintrc.json": null, "yarn.lock": null, "pnpm-lock.yaml": null, "bun.lockb": null, "bun.lock": null }); const c = await analyzeRepo(base); expect(c.use_node).toBe(true); expect(c.run_tests).toBe(true); expect(c.run_build).toBe(true); });
  it("detect yarn", async () => { mock({ "package.json": JSON.stringify({ scripts: { test: "jest" } }), "yarn.lock": "# lock", Dockerfile: null, "requirements.txt": null, "go.mod": null, "Cargo.toml": null, "pnpm-lock.yaml": null, "bun.lockb": null, "bun.lock": null, ".eslintrc.js": null, "eslint.config.js": null, "eslint.config.mjs": null, "eslint.config.cjs": null, ".eslintrc.json": null }); expect((await analyzeRepo(base)).pkg_manager).toBe("yarn"); });
  it("detect Docker", async () => { mock({ Dockerfile: "FROM node:20", "package.json": null, "requirements.txt": null, "go.mod": null, "Cargo.toml": null }); expect((await analyzeRepo(base)).docker_build).toBe(true); });
  it("detect Python", async () => { mock({ "requirements.txt": "flask", "package.json": null, Dockerfile: null, "go.mod": null, "Cargo.toml": null }); expect((await analyzeRepo(base)).use_python).toBe(true); });
  it("detect Go", async () => { mock({ "go.mod": "module x\n\ngo 1.22", "package.json": null, Dockerfile: null, "requirements.txt": null, "Cargo.toml": null }); const c = await analyzeRepo(base); expect(c.use_go).toBe(true); expect(c.go_version).toBe("1.22"); });
  it("detect Rust", async () => { mock({ "Cargo.toml": '[package]\nname = "app"', "package.json": null, Dockerfile: null, "requirements.txt": null, "go.mod": null }); expect((await analyzeRepo(base)).use_rust).toBe(true); });
  it("detect ESLint → enable lint", async () => { mock({ "package.json": JSON.stringify({ scripts: { lint: "eslint .", test: "jest", build: "tsc" } }), "eslint.config.js": "export default {}", Dockerfile: null, "requirements.txt": null, "go.mod": null, "Cargo.toml": null, "yarn.lock": null, "pnpm-lock.yaml": null, "bun.lockb": null, "bun.lock": null, ".eslintrc.js": null, "eslint.config.mjs": null, "eslint.config.cjs": null, ".eslintrc.json": null }); expect((await analyzeRepo(base)).check_quality).toBe(true); });
  it("set branches from param", async () => { mockFetch.mockResolvedValue({ ok: false, text: async () => "" }); const c = await analyzeRepo({ ...base, branch: "develop" }); expect(c.push_branches).toEqual(["develop"]); });
});
