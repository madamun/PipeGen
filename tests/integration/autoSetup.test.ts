import { describe, it, expect } from "vitest";
import { generateYamlFromValues, validateYaml } from "../../packages/lib/pipelineEngine";
import { MOCK_CATEGORIES, baseValues } from "../utils/test-fixtures";
import type { AnalyzedConfig } from "../../packages/server/pipelineAnalyzer";

describe("Auto Setup Integration — analyze → apply → generate", () => {
  it("Node.js project → valid pipeline", () => {
    const config: AnalyzedConfig = { use_node: true, node_version: "20", pkg_manager: "npm", install_cmd: "npm ci", run_tests: true, test_cmd: "npm test", run_build: true, build_cmd: "npm run build", enable_push: true, push_branches: ["main"], enable_pr: true, pr_branches: ["main"], pipeline_name: "Auto-Generated-Pipeline" };
    const merged = { ...baseValues, ...config };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, merged, "github", "");
    expect(validateYaml(yaml)).toEqual([]);
    expect(yaml).toContain("Setup Node.js");
    expect(yaml).toContain("npm ci");
    expect(yaml).toContain("Run Tests");
    expect(yaml).toContain("Build Project");
  });

  it("Python project → valid pipeline", () => {
    const config: AnalyzedConfig = { use_python: true, py_version: "3.11", run_tests: true, test_cmd: "pytest", enable_push: true, push_branches: ["main"], pipeline_name: "Python-CI" };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, ...config }, "github", "");
    expect(validateYaml(yaml)).toEqual([]);
    expect(yaml).toContain("Setup Python");
    expect(yaml).toContain("3.11");
  });

  it("Node.js + Docker → pipeline with both", () => {
    const config: AnalyzedConfig = { use_node: true, docker_build: true, docker_tag: "latest", image_name: "myapp", run_build: true, enable_push: true, push_branches: ["main"] };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, ...config }, "github", "");
    expect(validateYaml(yaml)).toEqual([]);
    expect(yaml).toContain("Setup Node.js");
    expect(yaml).toContain("Docker");
  });

  it("Node.js + ESLint → pipeline with lint", () => {
    const config: AnalyzedConfig = { use_node: true, check_quality: true, lint_cmd: "npm run lint", run_tests: true, test_cmd: "npm test" };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, ...config }, "github", "");
    expect(yaml).toContain("Check Code Quality");
    expect(yaml).toContain("Run Tests");
  });

  it("GitLab target → valid GitLab YAML", () => {
    const config: AnalyzedConfig = { use_node: true, run_tests: true, test_cmd: "npm test", run_build: true, build_cmd: "npm run build" };
    const yaml = generateYamlFromValues(MOCK_CATEGORIES, { ...baseValues, ...config }, "gitlab", "");
    expect(validateYaml(yaml)).toEqual([]);
    expect(yaml).toContain("stages:");
    expect(yaml).toContain("test_job:");
    expect(yaml).toContain("build_job:");
  });
});
