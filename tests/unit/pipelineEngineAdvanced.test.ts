import { describe, it, expect } from "vitest";
import { generateYamlFromValues, parseYamlToUI, validateYaml } from "../../packages/lib/pipelineEngine";
import { MOCK_CATEGORIES, baseValues } from "../utils/test-fixtures";

describe("linkedFields resolution", () => {
  it("yarn → yarn install --frozen-lockfile", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, pkg_manager: "yarn" }, "github", "")).toContain("yarn install --frozen-lockfile"));
  it("pnpm → pnpm install --frozen-lockfile", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, pkg_manager: "pnpm" }, "github", "")).toContain("pnpm install --frozen-lockfile"));
  it("bun → bun install --frozen-lockfile", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, pkg_manager: "bun" }, "github", "")).toContain("bun install --frozen-lockfile"));
  it("explicit install_cmd wins over linked", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, pkg_manager: "npm", install_cmd: "npm install" }, "github", "")).toContain("npm install"));
});

describe("runtime images", () => {
  it("Node → node:20", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, node_version: "20" }, "gitlab", "")).toContain("node:20"));
  it("Python → python:3.11", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_python: true, py_version: "3.11" }, "gitlab", "")).toContain("python:3.11"));
  it("Go → golang:1.22", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_go: true, go_version: "1.22" }, "gitlab", "")).toContain("golang:1.22"));
  it("Rust → rust:1.75", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_rust: true, rust_version: "1.75" }, "gitlab", "")).toContain("rust:1.75"));
  it("Node priority when multi-lang", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, use_python: true, node_version: "20" }, "gitlab", "")).toContain("image: node:20"));
});

describe("GitHub merge", () => {
  const existing = "name: CI\non:\n  push:\n    branches:\n      - main\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@v4";
  it("add test step", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_tests: true, test_cmd: "npm test" }, "github", existing); expect(y).toContain("Run Tests"); expect(validateYaml(y)).toEqual([]); });
  it("add build step", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_build: true }, "github", existing)).toContain("Build Project"));
  it("update pipeline name", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, pipeline_name: "New" }, "github", existing)).toContain("name: New"));
  it("preserve checkout", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_tests: true }, "github", existing)).toContain("Checkout Code"));
  it("valid after merge with all features", () => expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, run_tests: true, check_quality: true, run_build: true, docker_build: true }, "github", existing))).toEqual([]));
});

describe("GitLab merge", () => {
  const existing = "workflow:\n  rules:\n    - if: $CI_COMMIT_BRANCH == \"main\"\ndefault:\n  image: node:18\nstages:\n  - setup\n  - test\n  - build\n  - deploy";
  it("add test job", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, run_tests: true }, "gitlab", existing); expect(y).toContain("test_job:"); expect(validateYaml(y)).toEqual([]); });
  it("add build job", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_build: true }, "gitlab", existing)).toContain("build_job:"));
  it("add include", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_include: true, include_paths: [".gitlab/ci/a.yml"] }, "gitlab", existing)).toContain("include:"));
});

describe("provider switching", () => {
  it("GitHub vs GitLab different structure", () => { const v = { ...baseValues, use_node: true, run_tests: true }; const gh = generateYamlFromValues(MOCK_CATEGORIES, v, "github", ""); const gl = generateYamlFromValues(MOCK_CATEGORIES, v, "gitlab", ""); expect(gh).toContain("jobs:"); expect(gl).toContain("stages:"); expect(gh).not.toContain("stages:"); expect(gl).not.toContain("jobs:"); });
  it("both valid", () => { const v = { ...baseValues, use_node: true, run_tests: true }; expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, v, "github", ""))).toEqual([]); expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, v, "gitlab", ""))).toEqual([]); });
});

describe("Slack variations", () => {
  it("always()", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_slack: true, slack_notify_on: "always" }, "github", "")).toContain("always()"));
  it("failure()", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_slack: true, slack_notify_on: "on_failure" }, "github", "")).toContain("failure()"));
  it("success()", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_slack: true, slack_notify_on: "on_success" }, "github", "")).toContain("success()"));
});

describe("full pipeline — all features", () => {
  it("GitHub all features valid", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, pipeline_name: "Full", enable_push: true, push_branches: ["main"], use_node: true, node_version: "20", run_tests: true, test_cmd: "npm test", check_quality: true, enable_security: true, enable_coverage: true, run_build: true, docker_build: true, image_name: "app", deploy_vercel: true, enable_slack: true, slack_notify_on: "always", enable_cache: true }, "github", ""); expect(validateYaml(y)).toEqual([]); expect(y).toContain("Full"); expect(y).toContain("Run Tests"); expect(y).toContain("Build Project"); expect(y).toContain("Docker"); expect(y).toContain("Vercel"); expect(y).toContain("Slack"); });
  it("GitLab all features valid", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, pipeline_name: "GL-Full", use_node: true, run_tests: true, run_build: true, deploy_vercel: true, enable_slack: true, slack_notify_on: "always" }, "gitlab", ""); expect(validateYaml(y)).toEqual([]); expect(y).toContain("stages:"); expect(y).toContain("test_job:"); expect(y).toContain("build_job:"); expect(y).toContain("deploy_vercel:"); expect(y).toContain("notify_slack:"); });
});
