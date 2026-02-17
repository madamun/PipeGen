import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, branch, provider } = await req.json();

    // Reset ค่าเป็น Default (npm) ก่อนเสมอ
    const detectedConfig: Record<string, any> = {
        use_node: false,
        use_python: false,
        docker_build: false,
        run_tests: false,
        run_build: false,
        node_version: "18",
        pkg_manager: "npm", // <--- ค่าเริ่มต้นคือ npm
        py_version: "3.9",
        pipeline_name: "Auto-Generated-Pipeline",
        enable_push: true,
        push_branches: [branch || "main"],
        enable_pr: true,
        pr_branches: [branch || "main"]
    };

    try {
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id, providerId: provider }
        });
        if (!account?.accessToken) return NextResponse.json({ error: "Token not found" }, { status: 401 });
        const token = account.accessToken;

        const fetchFile = async (filename: string) => {
            let url = "";
            let fetchHeaders: any = {};
            if (provider === 'github') {
                url = `https://api.github.com/repos/${repoFullName}/contents/${filename}?ref=${branch}`;
                fetchHeaders = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" };
            } else {
                url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/repository/files/${filename}/raw?ref=${branch}`;
                fetchHeaders = { Authorization: `Bearer ${token}` };
            }
            const res = await fetch(url, { headers: fetchHeaders });
            return res.ok ? await res.text() : null;
        };

        // ---------------------------------------------------------
        // 🕵️‍♂️ Detective Logic
        // ---------------------------------------------------------

        // 🐳 1. Docker
        const dockerContent = await fetchFile("Dockerfile");
        if (dockerContent) {
            detectedConfig["docker_build"] = true;
            detectedConfig["docker_tag"] = "latest";
        }

        // 🟢 2. Node.js
        const packageJsonRaw = await fetchFile("package.json");
        if (packageJsonRaw) {
            detectedConfig["use_node"] = true;

            // 2.1 Check Lock Files (เพื่อหา Yarn/PNPM) 🔥
            const pnpmLock = await fetchFile("pnpm-lock.yaml");
            if (pnpmLock) {
                detectedConfig["pkg_manager"] = "pnpm";
            } else {
                const yarnLock = await fetchFile("yarn.lock");
                if (yarnLock) {
                    detectedConfig["pkg_manager"] = "yarn";
                }
            }

            // 2.2 Parse package.json
            try {
                const pkg = JSON.parse(packageJsonRaw);

                // --- ส่วนเช็ค Node Version ---
                if (pkg.engines?.node) {
                    const ver = pkg.engines.node;
                    if (ver.includes("20")) detectedConfig["node_version"] = "20";
                    else if (ver.includes("16")) detectedConfig["node_version"] = "16";
                }
                else if (pkg.devDependencies?.vite || pkg.dependencies?.next) {
                    detectedConfig["node_version"] = "20";
                }

                // --- ส่วนเช็ค Scripts (Test, Build, Lint) ---
                if (pkg.scripts) {
                    if (pkg.scripts.test) {
                        detectedConfig["run_tests"] = true;
                        detectedConfig["test_cmd"] = `${detectedConfig["pkg_manager"]} test`;
                    }
                    if (pkg.scripts.build) {
                        detectedConfig["run_build"] = true;
                        detectedConfig["build_cmd"] = `${detectedConfig["pkg_manager"]} run build`;
                    }
                    if (pkg.scripts.lint) {
                        detectedConfig["check_quality"] = true;
                        detectedConfig["lint_cmd"] = `${detectedConfig["pkg_manager"]} run lint`;
                    }
                }

                switch (detectedConfig["pkg_manager"]) {
                    case "pnpm":
                        detectedConfig["install_cmd"] = "pnpm install --frozen-lockfile";
                        break;
                    case "yarn":
                        detectedConfig["install_cmd"] = "yarn install --frozen-lockfile";
                        break;
                    default:
                        detectedConfig["install_cmd"] = "npm ci";
                        break;
                }
                // -----------------------------------------------------------

            } catch (e) { console.error(e); }

        }

        // 🐍 3. Python
        const requirementsTxt = await fetchFile("requirements.txt");
        if (requirementsTxt) {
            detectedConfig["use_python"] = true;
        }

        return NextResponse.json({ config: detectedConfig });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}