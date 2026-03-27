import { describe, it, expect } from "vitest";
import { generateYamlFromValues, parseYamlToUI, validateYaml } from "../../packages/lib/pipelineEngine";
import { MOCK_CATEGORIES, baseValues } from "../utils/test-fixtures";

describe("validateYaml", () => {
  it("should return [] for valid YAML", () => expect(validateYaml("name: CI\non:\n  push:\n    branches: [main]")).toEqual([]));
  it("should return [] for empty", () => expect(validateYaml("")).toEqual([]));
  it("should return error for invalid YAML", () => expect(validateYaml("name: CI\n  bad:\n- broken").length).toBeGreaterThan(0));
  it("should return line number", () => { const e = validateYaml("name: t\non:\n  push:\n    branches: [main\njobs:"); expect(e[0].line).toBeGreaterThanOrEqual(1); });
  it("should catch tab chars", () => expect(validateYaml("name: t\n\tjobs:").length).toBeGreaterThan(0));
  it("should accept complex GitHub YAML", () => expect(validateYaml("name: CI\non:\n  push:\n    branches: [main]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test")).toEqual([]));
  it("should accept GitLab YAML", () => expect(validateYaml("stages:\n  - build\nbuild:\n  stage: build\n  script:\n    - npm ci")).toEqual([]));
});

describe("generateYamlFromValues — GitHub", () => {
  it("should return currentYaml when categories empty", () => expect(generateYamlFromValues([], {}, "github", "existing")).toBe("existing"));
  it("should gen pipeline name", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, pipeline_name: "My-CI" }, "github", "")).toContain("name: My-CI"));
  it("should gen basic structure", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, baseValues, "github", ""); expect(y).toContain("on:"); expect(y).toContain("jobs:"); expect(y).toContain("runs-on:"); expect(y).toContain("actions/checkout@"); });
  it("should include push trigger", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_push: true, push_branches: ["main"] }, "github", "")).toContain("push:"));
  it("should include PR trigger", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_pr: true, pr_branches: ["main"] }, "github", "")).toContain("pull_request:"));
  it("should include schedule", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_schedule: true, cron_expression: "0 2 * * 1" }, "github", ""); expect(y).toContain("schedule:"); expect(y).toContain("0 2 * * 1"); });
  it("should use workflow_dispatch when no triggers", () => expect(generateYamlFromValues(MOCK_CATEGORIES, baseValues, "github", "")).toContain("workflow_dispatch"));
  it("should include Node.js setup", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, node_version: "20", pkg_manager: "npm", install_cmd: "npm ci" }, "github", ""); expect(y).toContain("Setup Node.js"); expect(y).toContain("20"); expect(y).toContain("npm ci"); });
  it("should include Python", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_python: true, py_version: "3.11" }, "github", "")).toContain("Setup Python"));
  it("should include Go", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_go: true, go_version: "1.22" }, "github", "")).toContain("Setup Go"));
  it("should include Rust", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_rust: true }, "github", "")).toContain("Rust"));
  it("should include test", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_tests: true, test_cmd: "npm test" }, "github", "")).toContain("Run Tests"));
  it("should include lint", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, check_quality: true, lint_cmd: "npm run lint" }, "github", "")).toContain("Check Code Quality"));
  it("should include security", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_security: true }, "github", "")).toContain("Security check"));
  it("should include coverage", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_coverage: true }, "github", "")).toContain("Upload Coverage"));
  it("should include build", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_build: true }, "github", "")).toContain("Build Project"));
  it("should include Docker", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, docker_build: true, image_name: "app" }, "github", "")).toContain("Docker"));
  it("should include Vercel", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, deploy_vercel: true }, "github", "")).toContain("Deploy to Vercel"));
  it("should include Slack", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_slack: true, slack_notify_on: "always" }, "github", "")).toContain("Notify Slack"));
  it("should include cache", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, enable_cache: true, cache_path: "node_modules" }, "github", "")).toContain("Cache dependencies"));
  it("should NOT include disabled", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, baseValues, "github", ""); expect(y).not.toContain("Run Tests"); expect(y).not.toContain("Docker"); });
  it("should produce valid YAML", () => expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, run_tests: true }, "github", ""))).toEqual([]));
  it("should be deterministic", () => { const v = { ...baseValues, use_node: true }; expect(generateYamlFromValues(MOCK_CATEGORIES, v, "github", "")).toBe(generateYamlFromValues(MOCK_CATEGORIES, v, "github", "")); });
  it("should handle runner OS", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, runner_os: "macos-13" }, "github", "")).toContain("macos-13"));
  it("should merge into existing YAML", () => { const e = "name: X\non:\n  push:\n    branches: [main]\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4"; expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_tests: true, test_cmd: "npm test" }, "github", e)).toContain("Run Tests"); });
});

describe("generateYamlFromValues — GitLab", () => {
  it("should gen stages", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, baseValues, "gitlab", ""); expect(y).toContain("stages:"); expect(y).toContain("workflow:"); });
  it("should include default image for Node", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, node_version: "20" }, "gitlab", "")).toContain("image: node:20"));
  it("should include setup_node", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true }, "gitlab", "")).toContain("setup_node:"));
  it("should include test_job", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_tests: true }, "gitlab", "")).toContain("test_job:"));
  it("should include build_job", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, run_build: true }, "gitlab", "")).toContain("build_job:"));
  it("should include include:", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_include: true, include_paths: [".gitlab/ci/test.yml"] }, "gitlab", "")).toContain("include:"));
  it("should produce valid YAML", () => expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true, run_tests: true }, "gitlab", ""))).toEqual([]));
  it("should include pipeline name", () => expect(generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, pipeline_name: "GL-CI" }, "gitlab", "")).toContain("GL-CI"));
});

describe("parseYamlToUI — GitHub", () => {
  it("should return {} for empty", () => expect(parseYamlToUI("", MOCK_CATEGORIES, "github").newValues).toEqual({}));
  it("should detect pipeline name", () => expect(parseYamlToUI("name: My-CI\non:\n  push:", MOCK_CATEGORIES, "github").newValues["pipeline_name"]).toBe("My-CI"));
  it("should detect push trigger", () => { const r = parseYamlToUI("name: CI\non:\n  push:\n    branches: [main]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []", MOCK_CATEGORIES, "github"); expect(r.newValues["enable_push"]).toBe(true); expect(r.newValues["push_branches"]).toEqual(["main"]); });
  it("should detect PR", () => expect(parseYamlToUI("name: CI\non:\n  pull_request:\n    branches: [main]\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []", MOCK_CATEGORIES, "github").newValues["enable_pr"]).toBe(true));
  it("should detect schedule", () => expect(parseYamlToUI("name: CI\non:\n  schedule:\n    - cron: '0 2 * * 1'\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []", MOCK_CATEGORIES, "github").newValues["enable_schedule"]).toBe(true));
  it("should detect Node.js", () => expect(parseYamlToUI("name: CI\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n      - name: Install Dependencies\n        run: npm ci", MOCK_CATEGORIES, "github").newValues["use_node"]).toBe(true));
  it("should detect test", () => expect(parseYamlToUI("name: CI\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Run Tests\n        run: npm test", MOCK_CATEGORIES, "github").newValues["run_tests"]).toBe(true));
  it("should detect build", () => expect(parseYamlToUI("name: CI\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Build Project\n        run: npm run build", MOCK_CATEGORIES, "github").newValues["run_build"]).toBe(true));
  it("should detect Docker", () => expect(parseYamlToUI("name: CI\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Build Docker Image\n        run: docker build -t app .", MOCK_CATEGORIES, "github").newValues["docker_build"]).toBe(true));
  it("should detect syntax as github", () => expect(parseYamlToUI("name: CI\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []", MOCK_CATEGORIES, "github").detectedSyntax).toBe("github"));
});

describe("parseYamlToUI — GitLab", () => {
  it("should detect gitlab from stages", () => expect(parseYamlToUI("stages:\n  - build\nbuild:\n  stage: build\n  script:\n    - npm ci", MOCK_CATEGORIES, "github").detectedSyntax).toBe("gitlab"));
  it("should detect gitlab from workflow", () => expect(parseYamlToUI("workflow:\n  rules:\n    - when: always\nstages:\n  - build", MOCK_CATEGORIES, "github").detectedSyntax).toBe("gitlab"));
  it("should detect include paths", () => { const r = parseYamlToUI("include:\n  - local: .gitlab/ci/test.yml\nstages:\n  - build", MOCK_CATEGORIES, "gitlab"); expect(r.newValues["use_include"]).toBe(true); expect(r.newValues["include_paths"]).toEqual([".gitlab/ci/test.yml"]); });
  it("should detect name from comment", () => expect(parseYamlToUI("# Pipeline: GL-CI\nstages:\n  - build", MOCK_CATEGORIES, "gitlab").newValues["pipeline_name"]).toBe("GL-CI"));
});

describe("two-way roundtrip", () => {
  it("GitHub roundtrip", () => { const v = { ...baseValues, pipeline_name: "RT", enable_push: true, push_branches: ["main"], use_node: true, run_tests: true, run_build: true }; const y = generateYamlFromValues(MOCK_CATEGORIES, v, "github", ""); expect(validateYaml(y)).toEqual([]); const { newValues: nv } = parseYamlToUI(y, MOCK_CATEGORIES, "github"); expect(nv["pipeline_name"]).toBe("RT"); expect(nv["use_node"]).toBe(true); expect(nv["run_tests"]).toBe(true); });
  it("GitLab roundtrip", () => { const y = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, use_node: true }, "gitlab", ""); expect(parseYamlToUI(y, MOCK_CATEGORIES, "gitlab").detectedSyntax).toBe("gitlab"); });
  it("idempotent", () => { const v = { ...baseValues, use_node: true, run_tests: true }; const y1 = generateYamlFromValues(MOCK_CATEGORIES, v, "github", ""); const { newValues: nv } = parseYamlToUI(y1, MOCK_CATEGORIES, "github"); expect(generateYamlFromValues(MOCK_CATEGORIES, nv, "github", "")).toContain("Run Tests"); });
});

describe("edge cases", () => {
  it("empty values → valid", () => expect(validateYaml(generateYamlFromValues(MOCK_CATEGORIES, {}, "github", ""))).toEqual([]));
  it("malformed YAML → no crash", () => expect(() => generateYamlFromValues(MOCK_CATEGORIES, baseValues, "github", "{{{broken")).not.toThrow());
  it("unicode → no crash", () => expect(() => parseYamlToUI("name: テスト\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []", MOCK_CATEGORIES, "github")).not.toThrow());
  it("large YAML < 500ms", () => { const s = performance.now(); parseYamlToUI("name: Big\non:\n  push:\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n" + Array.from({ length: 50 }, (_, i) => `      - name: Step ${i}\n        run: echo ${i}`).join("\n"), MOCK_CATEGORIES, "github"); expect(performance.now() - s).toBeLessThan(500); });
});
