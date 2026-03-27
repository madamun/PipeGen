import { describe, it, expect } from "vitest";
import { generateYamlFromValues, parseYamlToUI, validateYaml } from "../../packages/lib/pipelineEngine";
import { MOCK_CATEGORIES, baseValues } from "../utils/test-fixtures";

describe("YAML Sync Integration — round-trip", () => {
  it("GitHub: full pipeline roundtrip preserves all components", () => {
    const v = { ...baseValues, pipeline_name: "Sync-Test", enable_push: true, push_branches: ["main", "develop"], enable_pr: true, pr_branches: ["main"], use_node: true, node_version: "20", pkg_manager: "npm", install_cmd: "npm ci", run_tests: true, test_cmd: "npm test", check_quality: true, lint_cmd: "npm run lint", run_build: true, build_cmd: "npm run build" };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, v, "github", "");
    expect(validateYaml(yaml)).toEqual([]);
    const { newValues, detectedSyntax } = parseYamlToUI(yaml, MOCK_CATEGORIES, "github");
    expect(detectedSyntax).toBe("github");
    expect(newValues["pipeline_name"]).toBe("Sync-Test");
    expect(newValues["enable_push"]).toBe(true);
    expect(newValues["push_branches"]).toEqual(["main", "develop"]);
    expect(newValues["use_node"]).toBe(true);
    expect(newValues["run_tests"]).toBe(true);
    expect(newValues["check_quality"]).toBe(true);
    expect(newValues["run_build"]).toBe(true);
  });

  it("GitLab: full pipeline roundtrip preserves structure", () => {
    const v = { ...baseValues, pipeline_name: "GL-Sync", enable_push: true, push_branches: ["main"], use_node: true, node_version: "18", run_tests: true, run_build: true };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, v, "gitlab", "");
    expect(validateYaml(yaml)).toEqual([]);
    const { detectedSyntax } = parseYamlToUI(yaml, MOCK_CATEGORIES, "gitlab");
    expect(detectedSyntax).toBe("gitlab");
  });

  it("idempotent: gen → parse → gen → parse → same result", () => {
    const v = { ...baseValues, use_node: true, run_tests: true, enable_push: true, push_branches: ["main"] };
    const y1 = generateYamlFromValues(MOCK_CATEGORIES, v, "github", "");
    const { newValues: nv1 } = parseYamlToUI(y1, MOCK_CATEGORIES, "github");
    const y2 = generateYamlFromValues(MOCK_CATEGORIES, nv1, "github", "");
    const { newValues: nv2 } = parseYamlToUI(y2, MOCK_CATEGORIES, "github");
    expect(nv1["use_node"]).toEqual(nv2["use_node"]);
    expect(nv1["run_tests"]).toEqual(nv2["run_tests"]);
  });

  it("external YAML → parse → gen → valid and contains same steps", () => {
    const external = `name: External-CI\non:\n  push:\n    branches: [main]\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - name: Install Dependencies\n        run: npm ci\n      - name: Run Tests\n        run: npm test\n      - name: Build Project\n        run: npm run build`;
    const { newValues } = parseYamlToUI(external, MOCK_CATEGORIES, "github");
    expect(newValues["use_node"]).toBe(true);
    expect(newValues["run_tests"]).toBe(true);
    expect(newValues["run_build"]).toBe(true);
    const regen = generateYamlFromValues(MOCK_CATEGORIES, newValues, "github", "");
    expect(validateYaml(regen)).toEqual([]);
    expect(regen).toContain("Run Tests");
    expect(regen).toContain("Build Project");
  });
});
