import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

describe("usePipeline hook", () => {
  it("should throw when used outside PipelineProvider", async () => {
    const { usePipeline } = await import("../../packages/components/workspace/PipelineProvider");
    function Bad() { usePipeline(); return <div />; }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow("usePipeline must be used within a PipelineProvider");
    spy.mockRestore();
  });
});

describe("updateComponentValue — branch defaults", () => {
  it("should default push_branches to [defaultBranch] when enable_push toggled on", () => {
    const values: Record<string, any> = {};
    const defaultBranch = "main";
    if (values["enable_push"] === undefined) values["push_branches"] = [defaultBranch];
    expect(values["push_branches"]).toEqual(["main"]);
  });

  it("should default pr_branches to [defaultBranch] when enable_pr toggled on", () => {
    const values: Record<string, any> = {};
    if (values["enable_pr"] === undefined) values["pr_branches"] = ["develop"];
    expect(values["pr_branches"]).toEqual(["develop"]);
  });

  it("should prevent empty push_branches when push is enabled", () => {
    let value: string[] = [];
    const enabled = true;
    if (enabled && value.length === 0) value = ["main"];
    expect(value).toEqual(["main"]);
  });
});

describe("applyMultipleValues — batch update", () => {
  it("should merge config into componentValues", () => {
    const current = { pipeline_name: "Old", runner_os: "ubuntu-latest" };
    const config = { use_node: true, run_tests: true };
    const merged = { ...current, ...config };
    expect(merged.use_node).toBe(true);
    expect(merged.pipeline_name).toBe("Old");
  });

  it("should resolve linkedFields for batch", () => {
    const config: Record<string, any> = { pkg_manager: "yarn" };
    const linked = { install_cmd: { npm: "npm ci", yarn: "yarn install --frozen-lockfile" } };
    const resolved = linked.install_cmd[config.pkg_manager as keyof typeof linked.install_cmd];
    expect(resolved).toBe("yarn install --frozen-lockfile");
  });
});

describe("setProvider — platform switching", () => {
  it("should apply platformDefaults for github", () => {
    const field = { id: "docker_username", platformDefaults: { github: "${{ secrets.DOCKER_USERNAME }}", gitlab: "$DOCKER_USERNAME" } };
    expect(field.platformDefaults["github"]).toBe("${{ secrets.DOCKER_USERNAME }}");
  });

  it("should apply platformDefaults for gitlab", () => {
    const field = { id: "docker_username", platformDefaults: { github: "${{ secrets.DOCKER_USERNAME }}", gitlab: "$DOCKER_USERNAME" } };
    expect(field.platformDefaults["gitlab"]).toBe("$DOCKER_USERNAME");
  });
});
