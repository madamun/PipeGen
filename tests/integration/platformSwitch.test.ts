import { describe, it, expect } from "vitest";
import { generateYamlFromValues, parseYamlToUI, validateYaml } from "../../packages/lib/pipelineEngine";
import { MOCK_CATEGORIES, baseValues } from "../utils/test-fixtures";

describe("Platform Switch Integration", () => {
  const nodeValues = { ...baseValues, use_node: true, node_version: "20", run_tests: true, test_cmd: "npm test", run_build: true, build_cmd: "npm run build", enable_push: true, push_branches: ["main"] };

  it("GitHub → GitLab: same features, different structure", () => {
    const gh = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "github", "");
    const gl = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "gitlab", "");
    expect(validateYaml(gh)).toEqual([]); expect(validateYaml(gl)).toEqual([]);
    expect(gh).toContain("jobs:"); expect(gh).toContain("runs-on:");
    expect(gl).toContain("stages:"); expect(gl).not.toContain("runs-on:");
  });

  it("parse GitHub YAML → detect as github", () => {
    const gh = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "github", "");
    expect(parseYamlToUI(gh, MOCK_CATEGORIES, "github").detectedSyntax).toBe("github");
  });

  it("parse GitLab YAML → detect as gitlab", () => {
    const gl = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "gitlab", "");
    expect(parseYamlToUI(gl, MOCK_CATEGORIES, "gitlab").detectedSyntax).toBe("gitlab");
  });

  it("switch preserves component detection", () => {
    const gh = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "github", "");
    const { newValues: ghParsed } = parseYamlToUI(gh, MOCK_CATEGORIES, "github");
    const gl = generateYamlFromValues(MOCK_CATEGORIES, nodeValues, "gitlab", "");
    const { newValues: glParsed } = parseYamlToUI(gl, MOCK_CATEGORIES, "gitlab");
    // ทั้งสอง platform ต้องตรวจพบ component เดียวกัน
    expect(ghParsed["use_node"]).toBe(true);
    expect(glParsed["use_node"]).toBe(true);
    expect(ghParsed["run_tests"]).toBe(true);
  });
});
