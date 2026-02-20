/**
 * Pipeline analyzer: detect project config (Node, Python, Docker, scripts) from repo files.
 * Used by POST /api/pipeline/analyze.
 */

import type { ComponentValues } from "@/packages/types/pipeline";

export interface AnalyzeRepoParams {
  repoFullName: string;
  branch: string;
  provider: "github" | "gitlab";
  accessToken: string;
}

export interface AnalyzedConfig extends ComponentValues {
  use_node?: boolean;
  use_python?: boolean;
  docker_build?: boolean;
  docker_tag?: string;
  run_tests?: boolean;
  run_build?: boolean;
  check_quality?: boolean;
  node_version?: string;
  pkg_manager?: string;
  py_version?: string;
  pipeline_name?: string;
  enable_push?: boolean;
  push_branches?: string[];
  enable_pr?: boolean;
  pr_branches?: string[];
  test_cmd?: string;
  build_cmd?: string;
  lint_cmd?: string;
  install_cmd?: string;
}

const DEFAULT_CONFIG: AnalyzedConfig = {
  use_node: false,
  use_python: false,
  docker_build: false,
  run_tests: false,
  run_build: false,
  node_version: "18",
  pkg_manager: "npm",
  py_version: "3.9",
  pipeline_name: "Auto-Generated-Pipeline",
  enable_push: true,
  enable_pr: true,
};

async function fetchRepoFile(
  repoFullName: string,
  branch: string,
  provider: "github" | "gitlab",
  accessToken: string,
  filename: string,
): Promise<string | null> {
  let url: string;
  const headers: Record<string, string> =
    provider === "github"
      ? {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3.raw",
        }
      : { Authorization: `Bearer ${accessToken}` };

  if (provider === "github") {
    url = `https://api.github.com/repos/${repoFullName}/contents/${filename}?ref=${branch}`;
  } else {
    url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/repository/files/${encodeURIComponent(filename)}/raw?ref=${branch}`;
  }

  const res = await fetch(url, { headers });
  return res.ok ? res.text() : null;
}

export async function analyzeRepo(
  params: AnalyzeRepoParams,
): Promise<AnalyzedConfig> {
  const { repoFullName, branch, provider, accessToken } = params;
  const defaultBranch = branch || "main";

  const config: AnalyzedConfig = {
    ...DEFAULT_CONFIG,
    push_branches: [defaultBranch],
    pr_branches: [defaultBranch],
  };

  const fetchFile = (filename: string) =>
    fetchRepoFile(repoFullName, branch, provider, accessToken, filename);

  // 1. Docker
  const dockerContent = await fetchFile("Dockerfile");
  if (dockerContent) {
    config.docker_build = true;
    config.docker_tag = "latest";
  }

  // 2. Node.js
  const packageJsonRaw = await fetchFile("package.json");
  if (packageJsonRaw) {
    config.use_node = true;

    const pnpmLock = await fetchFile("pnpm-lock.yaml");
    if (pnpmLock) {
      config.pkg_manager = "pnpm";
    } else {
      const yarnLock = await fetchFile("yarn.lock");
      if (yarnLock) config.pkg_manager = "yarn";
    }

    try {
      const pkg = JSON.parse(packageJsonRaw) as Record<string, unknown>;
      const engines = pkg.engines as { node?: string } | undefined;
      const scripts = pkg.scripts as Record<string, string> | undefined;
      const deps = {
        ...(pkg.dependencies as Record<string, string>),
        ...(pkg.devDependencies as Record<string, string>),
      };

      if (engines?.node) {
        const ver = engines.node;
        if (ver.includes("20")) config.node_version = "20";
        else if (ver.includes("16")) config.node_version = "16";
      } else if (deps?.vite || deps?.next) {
        config.node_version = "20";
      }

      if (scripts) {
        if (scripts.test) {
          config.run_tests = true;
          config.test_cmd = `${config.pkg_manager} test`;
        }
        if (scripts.build) {
          config.run_build = true;
          config.build_cmd = `${config.pkg_manager} run build`;
        }
        if (scripts.lint) {
          config.check_quality = true;
          config.lint_cmd = `${config.pkg_manager} run lint`;
        }
      }

      switch (config.pkg_manager) {
        case "pnpm":
          config.install_cmd = "pnpm install --frozen-lockfile";
          break;
        case "yarn":
          config.install_cmd = "yarn install --frozen-lockfile";
          break;
        default:
          config.install_cmd = "npm ci";
          break;
      }
    } catch (e) {
      console.error("parse package.json", e);
    }
  }

  // 3. Python
  const requirementsTxt = await fetchFile("requirements.txt");
  if (requirementsTxt) {
    config.use_python = true;
  }

  return config;
}
