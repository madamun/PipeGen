// src/app/api/pipeline/files/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get("repoFullName");
    const branch = searchParams.get("branch") || "main";

    if (!repoFullName)
      return NextResponse.json({ error: "Missing repo" }, { status: 400 });

    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    if (!repo)
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );

    const provider = repo.provider;
    let drafts: any[] = [];
    let gitFiles: any[] = [];

    // 1. ดึง Drafts
    const dbPipelines = await prisma.pipeline.findMany({
      where: {
        repoId: repo.id,
        branch: branch,
        drafts: { some: {} },
      },
      select: { filePath: true, name: true }, // *ถ้าจะให้ Draft มี content ด้วยต้อง select เพิ่ม*
    });

    drafts = dbPipelines.map((p) => ({
      fileName: p.name,
      fullPath: p.filePath,
      source: "draft",
    }));

    // 2. ดึง Git Files
    try {
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, providerId: provider },
      });

      if (account?.accessToken) {
        // ==========================================
        // 🐙 GITHUB LOGIC
        // ==========================================
        if (provider === "github") {
          const ghRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/contents/.github/workflows?ref=${branch}`,
            {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            },
          );

          if (ghRes.ok) {
            const data = await ghRes.json();
            if (Array.isArray(data)) {
              // GitHub ส่งมาเป็น List ต้องวน loop ดึง content หรือส่งไปแค่ List
              // *เคสนี้เราส่งแค่ List ไปก่อน (เหมือนเดิม)*
              gitFiles = data
                .filter(
                  (f: any) =>
                    f.name.endsWith(".yml") || f.name.endsWith(".yaml"),
                )
                .map((f: any) => ({
                  fileName: f.name,
                  fullPath: f.path,
                  source: "git",
                  // content: ... (ปกติ GitHub API List ไม่ส่ง content มาให้ ต้อง fetch แยก)
                }));
            }
          }
        }

        // ==========================================
        // 🦊 GITLAB LOGIC (พระเอกของเรา)
        // ==========================================
else if (provider === "gitlab") {
          const encodedId = encodeURIComponent(repoFullName);
          // 🔥 1. ดึง Tree แบบลึก
          const apiUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/tree?ref=${branch}&recursive=true&per_page=100`;

          const glRes = await fetch(apiUrl, {
            method: "GET",
            headers: { Authorization: `Bearer ${account.accessToken}` },
          });

          if (glRes.ok) {
            const files = await glRes.json();
            if (Array.isArray(files)) {
              // 2. กรองเหมือนกับหน้า Sync
              const ymlFiles = files.filter((f: any) => {
                if (f.type !== "blob") return false;
                const lowerPath = f.path.toLowerCase();
                return (lowerPath.endsWith(".yml") || lowerPath.endsWith(".yaml")) && 
                       (lowerPath === ".gitlab-ci.yml" || lowerPath.startsWith(".gitlab/ci/"));
              });
              
              ymlFiles.forEach((f: any) => {
                gitFiles.push({
                  fileName: f.name, 
                  fullPath: f.path, // ส่ง Path เต็มกลับไป
                  source: "git",
                });
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`${provider} fetch error:`, e);
    }

    // 3. กรอง Drafts
    const draftPaths = new Set(drafts.map((d) => d.fullPath));
    gitFiles = gitFiles.filter((f) => !draftPaths.has(f.fullPath));

    return NextResponse.json({ drafts, gitFiles });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
