/**
 * Pipeline analyzer: detect project config (Node, Python, Docker, scripts) from repo files.
 * Used by POST /api/pipeline/analyze.
 */

import { X } from "lucide-react";
import type { ComponentValues } from "../types/pipeline";

export interface AnalyzeRepoParams {
  repoFullName: string;
  branch: string;
  provider: "github" | "gitlab";
  accessToken: string;
}

export interface AnalyzedConfig extends ComponentValues {
  use_node?: boolean;
  use_python?: boolean;
  use_go?: boolean;
  use_rust?: boolean;
  docker_build?: boolean;
  docker_tag?: string;
  run_tests?: boolean;
  run_build?: boolean;
  check_quality?: boolean;
  node_version?: string;
  pkg_manager?: string;
  py_version?: string;
  go_version?: string;
  rust_version?: string;
  pipeline_name?: string;
  enable_push?: boolean;
  push_branches?: string[];
  enable_pr?: boolean;
  pr_branches?: string[];
  test_cmd?: string;
  build_cmd?: string;
  lint_cmd?: string;
  install_cmd?: string;
  detected_framework?: string;
  detected_test_framework?: string;
  has_prisma?: boolean;
  has_playwright?: boolean;
  has_cypress?: boolean;
  extra_install_steps?: string;
  detected_build_tool?: string;
  // เพิ่ม Properties สำหรับ Cache
  enable_cache?: boolean;
  cache_path?: string;
  cache_key?: string;
  // Monorepo / Deep Scan
  is_monorepo?: boolean;
  sub_projects?: string[];
  sub_project_details?: string[];
  detected_docker_path?: string;
  existing_ci_files?: string[];
  has_env_example?: boolean;
  docker_context?: string;
  docker_file_flag?: string;
  all_dockerfiles?: string[];
}
X

const DEFAULT_CONFIG: AnalyzedConfig = {
  use_node: false,
  use_python: false,
  use_go: false,
  use_rust: false,
  docker_build: false,
  run_tests: false,
  run_build: false,
  node_version: "18",
  pkg_manager: "npm",
  py_version: "3.9",
  go_version: "1.21",
  rust_version: "stable",
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

// === Git Tree API: scan โครงสร้าง repo ทั้งหมด ===
interface RepoTreeFile {
  path: string;
  type: string; // "blob" (file) or "tree" (folder)
}

async function fetchRepoTree(
  repoFullName: string,
  branch: string,
  provider: "github" | "gitlab",
  accessToken: string,
): Promise<RepoTreeFile[]> {
  try {
    if (provider === "github") {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.tree || []).map((f: any) => ({ path: f.path, type: f.type === "blob" ? "blob" : "tree" }));
    } else {
      // GitLab: pagination needed, fetch first 100
      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/repository/tree?ref=${branch}&recursive=true&per_page=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((f: any) => ({ path: f.path, type: f.type === "blob" ? "blob" : "tree" }));
    }
  } catch (e) {
    console.error("[Analyzer] Tree fetch error:", e);
    return [];
  }
}

// === Monorepo detection: หา sub-projects จาก tree ===
interface SubProject {
  path: string; // e.g. "frontend", "backend", "packages/api"
  files: string[]; // files found in this sub-project
}

function detectSubProjects(tree: RepoTreeFile[]): SubProject[] {
  const projectIndicators = [
    "package.json",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
    "Dockerfile",
  ];

  // หา folders ที่มี indicator files
  const subProjects = new Map<string, string[]>();

  for (const file of tree) {
    if (file.type !== "blob") continue;
    const fileName = file.path.split("/").pop() || "";
    if (!projectIndicators.includes(fileName)) continue;

    const dir = file.path.includes("/")
      ? file.path.slice(0, file.path.lastIndexOf("/"))
      : ""; // root

    if (dir === "") continue; // root จัดการแยกแล้ว

    if (!subProjects.has(dir)) subProjects.set(dir, []);
    subProjects.get(dir)!.push(fileName);
  }

  return Array.from(subProjects.entries())
    .map(([path, files]) => ({ path, files }))
    .sort((a, b) => a.path.localeCompare(b.path));
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

    const bunLock = (await fetchFile("bun.lockb")) || (await fetchFile("bun.lock"));
    if (bunLock) {
      config.pkg_manager = "bun";
    } else {
      const pnpmLock = await fetchFile("pnpm-lock.yaml");
      if (pnpmLock) {
        config.pkg_manager = "pnpm";
      } else {
        const yarnLock = await fetchFile("yarn.lock");
        if (yarnLock) config.pkg_manager = "yarn";
      }
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
        // lint ไม่เปิดตรงนี้ → ไปเช็ค eslint config ใน section 6 แทน
        if (scripts.lint) {
          config.lint_cmd = `${config.pkg_manager} run lint`;
        }
      }
      switch (config.pkg_manager) {
        case "bun":
          config.install_cmd = "bun install --frozen-lockfile";
          if (scripts?.test) config.test_cmd = "bun test";
          if (scripts?.build) config.build_cmd = "bun run build";
          if (scripts?.lint) config.lint_cmd = "bun run lint";
          break;
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

  // 4. Go
  const goMod = await fetchFile("go.mod");
  if (goMod) {
    config.use_go = true;
    const goVerMatch = goMod.match(/^go\s+(\d+\.\d+)/m);
    if (goVerMatch) config.go_version = goVerMatch[1];
  }

  // 5. Rust
  const cargoToml = await fetchFile("Cargo.toml");
  if (cargoToml) {
    config.use_rust = true;
  }

  // 6. Lint — เปิดเฉพาะเมื่อมี eslint config + lint script
  if (packageJsonRaw) {
    const hasEslint =
      (await fetchFile(".eslintrc.js")) ||
      (await fetchFile(".eslintrc.json")) ||
      (await fetchFile("eslint.config.js")) ||
      (await fetchFile("eslint.config.mjs")) ||
      (await fetchFile("eslint.config.cjs"));
    if (hasEslint && config.lint_cmd) {
      config.check_quality = true;
    } else {
      config.check_quality = false;
      config.lint_cmd = undefined;
    }
  }

  // 7. Framework Detection — อ่าน dependencies เพื่อตั้งค่าให้ตรง framework
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw) as Record<string, unknown>;
      const deps = {
        ...(pkg.dependencies as Record<string, string>),
        ...(pkg.devDependencies as Record<string, string>),
      };
      const scripts = pkg.scripts as Record<string, string> | undefined;
      const pm = config.pkg_manager || "npm";
      const runCmd = pm === "bun" ? "bun run" : pm === "yarn" ? "yarn" : pm === "pnpm" ? "pnpm" : "npm run";

      // ============ Frontend Frameworks ============

      if (deps?.next) {
        config.node_version = "20";
        if (scripts?.build) config.build_cmd = `${runCmd} build`;
        config.run_build = true;
        config.enable_cache = true;
        config.cache_path = ".next/cache";
        config.cache_key = `nextjs-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Next.js";
      }
      else if (deps?.nuxt) {
        config.node_version = "20";
        if (scripts?.build) { config.build_cmd = `${runCmd} build`; config.run_build = true; }
        config.enable_cache = true;
        config.cache_path = ".nuxt";
        config.cache_key = `nuxt-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Nuxt";
      }
      else if (deps?.["@angular/core"]) {
        config.node_version = "20";
        if (scripts?.build) config.build_cmd = `${runCmd} build`;
        config.run_build = true;
        config.enable_cache = true;
        config.cache_path = ".angular/cache";
        config.cache_key = `angular-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Angular";
      }
      else if (deps?.["@sveltejs/kit"] || deps?.svelte) {
        config.node_version = "20";
        if (scripts?.build) { config.build_cmd = `${runCmd} build`; config.run_build = true; }
        config.detected_framework = "SvelteKit";
      }
      else if (deps?.astro) {
        config.node_version = "20";
        if (scripts?.build) { config.build_cmd = `${runCmd} build`; config.run_build = true; }
        config.enable_cache = true;
        config.cache_path = "node_modules/.astro";
        config.cache_key = `astro-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Astro";
      }
      else if (deps?.gatsby) {
        config.node_version = "20";
        if (scripts?.build) { config.build_cmd = `${runCmd} build`; config.run_build = true; }
        config.enable_cache = true;
        config.cache_path = ".cache\npublic";
        config.cache_key = `gatsby-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Gatsby";
      }
      else if (deps?.["@remix-run/node"] || deps?.["@remix-run/react"]) {
        config.node_version = "20";
        if (scripts?.build) { config.build_cmd = `${runCmd} build`; config.run_build = true; }
        config.detected_framework = "Remix";
      }
      else if (deps?.vite) {
        config.node_version = "20";
        if (scripts?.build) config.build_cmd = `${runCmd} build`;
        config.run_build = true;
        config.enable_cache = true;
        config.cache_path = "node_modules/.vite";
        config.cache_key = `vite-${pm}-\${{ runner.os }}`;
        config.detected_framework = "Vite";
      }

      // ============ Backend Frameworks ============

      else if (deps?.["@nestjs/core"]) {
        if (scripts?.build) config.build_cmd = `${runCmd} build`;
        config.run_build = true;
        config.run_tests = true;
        if (scripts?.test) config.test_cmd = `${runCmd} test`;
        config.detected_framework = "NestJS";
      }
      else if (deps?.elysia) {
        config.pkg_manager = "bun";
        config.install_cmd = "bun install --frozen-lockfile";
        if (scripts?.test) config.test_cmd = "bun test";
        if (scripts?.build) config.build_cmd = "bun run build";
        config.detected_framework = "Elysia";
      }
      else if (deps?.fastify) {
        config.detected_framework = "Fastify";
      }
      else if (deps?.hono) {
        config.detected_framework = "Hono";
      }
      else if (deps?.koa) {
        config.detected_framework = "Koa";
      }
      else if (deps?.express) {
        config.detected_framework = "Express";
      }

      // ============ Database / ORM ============

      // --- Prisma (รวม prisma generate เข้า install_cmd) ---
      const hasPrisma = !!(deps?.prisma || deps?.["@prisma/client"]);
      console.log("[Analyzer] Prisma check:", hasPrisma, "deps.prisma:", deps?.prisma, "deps.@prisma/client:", deps?.["@prisma/client"]);
      console.log("[Analyzer] install_cmd before:", config.install_cmd);
      if (hasPrisma) {
        config.has_prisma = true;
      }
      console.log("[Analyzer] install_cmd after:", config.install_cmd);

      // ============ Test Frameworks ============

      if (deps?.vitest) {
        config.test_cmd = pm === "bun" ? "bun run vitest run" : "npx vitest run";
        config.run_tests = true;
        config.detected_test_framework = "Vitest";
      } else if (deps?.jest) {
        config.test_cmd = pm === "bun" ? "bun test" : `${runCmd} test`;
        config.run_tests = true;
        config.detected_test_framework = "Jest";
      } else if (deps?.mocha) {
        config.test_cmd = "npx mocha";
        config.run_tests = true;
        config.detected_test_framework = "Mocha";
      }

      if (deps?.["@playwright/test"]) {
        config.has_playwright = true;
      }
      if (deps?.cypress) {
        config.has_cypress = true;
      }

      // ============ Build Tools ============

      if (deps?.turbo) {
        if (scripts?.build) config.build_cmd = "npx turbo build";
        config.detected_build_tool = "Turborepo";
      }

    } catch (e) {
      console.error("Framework detection error:", e);
    }
  }

  // 8. Monorepo Deep Scan — ใช้ Git Tree API scan โครงสร้างทั้ง repo
  try {
    const tree = await fetchRepoTree(repoFullName, branch, provider, accessToken);

    if (tree.length > 0) {
      // 8a. หา Dockerfile ทั้งหมด (root + subfolder)
      const allDockerfiles = tree.filter(f =>
        f.type === "blob" && (
          f.path === "Dockerfile" ||
          f.path.endsWith("/Dockerfile") ||
          f.path.endsWith("/dockerfile") ||
          f.path.endsWith(".Dockerfile")
        )
      );

      if (allDockerfiles.length > 0) {
        config.docker_build = true;
        config.docker_tag = "latest";

        // ถ้า root ไม่มี Dockerfile → ใช้ subfolder แทน
        const hasRootDockerfile = allDockerfiles.some(f => f.path === "Dockerfile");
        if (!hasRootDockerfile) {
          const subDockerfiles = allDockerfiles.filter(f => f.path !== "Dockerfile");
          if (subDockerfiles.length > 0) {
            config.detected_docker_path = subDockerfiles[0].path;
            const dockerDir = subDockerfiles[0].path.replace(/\/[^/]*$/, '') || '.';
            config.docker_context = dockerDir;
            config.docker_file_flag = `-f ${subDockerfiles[0].path}`;
          }
        }
        config.all_dockerfiles = allDockerfiles.map(f => f.path);
      }

      // 8b. หา CI files ที่มีอยู่แล้ว
      const existingCI = tree.filter(f =>
        f.type === "blob" && (
          f.path.startsWith(".github/workflows/") ||
          f.path === ".gitlab-ci.yml" ||
          f.path.startsWith(".gitlab/ci/")
        )
      );
      if (existingCI.length > 0) {
        config.existing_ci_files = existingCI.map(f => f.path);
      }

      // 8c. Detect sub-projects (monorepo)
      const subProjects = detectSubProjects(tree);

      if (subProjects.length > 0) {
        config.is_monorepo = true;
        config.sub_projects = subProjects.map(sp => sp.path);

        // analyze แต่ละ sub-project
        const subDetails: string[] = [];
        for (const sp of subProjects.slice(0, 5)) { // จำกัด 5 sub-projects
          const subPkg = await fetchFile(`${sp.path}/package.json`);
          if (subPkg) {
            try {
              const pkg = JSON.parse(subPkg) as Record<string, unknown>;
              const deps = { ...(pkg.dependencies as Record<string, string>), ...(pkg.devDependencies as Record<string, string>) };
              const parts: string[] = [sp.path];

              // detect framework ในแต่ละ sub-project
              if (deps?.next) parts.push("Next.js");
              else if (deps?.nuxt) parts.push("Nuxt");
              else if (deps?.["@angular/core"]) parts.push("Angular");
              else if (deps?.vite) parts.push("Vite");
              else if (deps?.["@nestjs/core"]) parts.push("NestJS");
              else if (deps?.elysia) parts.push("Elysia");
              else if (deps?.express) parts.push("Express");
              else if (deps?.fastify) parts.push("Fastify");

              if (deps?.prisma || deps?.["@prisma/client"]) parts.push("Prisma");
              if (deps?.vitest) parts.push("Vitest");
              else if (deps?.jest) parts.push("Jest");

              subDetails.push(parts.join(" → "));
            } catch { subDetails.push(sp.path); }
          } else if (sp.files.includes("requirements.txt")) {
            subDetails.push(`${sp.path} → Python`);
          } else if (sp.files.includes("go.mod")) {
            subDetails.push(`${sp.path} → Go`);
          } else if (sp.files.includes("Cargo.toml")) {
            subDetails.push(`${sp.path} → Rust`);
          } else {
            subDetails.push(sp.path);
          }
        }
        config.sub_project_details = subDetails;
      }

      // 8d. detect .env files
      const envFiles = tree.filter(f =>
        f.type === "blob" && (
          f.path === ".env.example" ||
          f.path === ".env.sample" ||
          f.path === ".env.template"
        )
      );
      if (envFiles.length > 0) {
        config.has_env_example = true;
      }
    }
  } catch (e) {
    console.error("[Analyzer] Monorepo scan error:", e);
  }

  return config;
}