// app/api/pipeline/files/route.ts
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
        drafts: { isNot: null },
      },
      select: { filePath: true, name: true },
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
        // 🦊 GITLAB LOGIC (อัปเกรดความฉลาดขั้นสุด!)
        // ==========================================
        else if (provider === "gitlab") {
          const encodedId = encodeURIComponent(repoFullName);

          // 🔥 1. แอบไปถาม GitLab ว่าโปรเจกต์นี้ใช้ Custom CI Path ไหม?
          let customCiPath = ".gitlab-ci.yml";
          try {
            const projectRes = await fetch(`https://gitlab.com/api/v4/projects/${encodedId}`, {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            });
            if (projectRes.ok) {
              const projectData = await projectRes.json();
              if (projectData.ci_config_path) customCiPath = projectData.ci_config_path;
            }
          } catch (e) {
            console.error("Failed to fetch project info for CI path:", e);
          }
          const lowerCustomPath = customCiPath.toLowerCase();

          // 🔥 1.5 แอบไปดึง "เนื้อหาดิบ" ของไฟล์หลักมาอ่าน!
          let mainCiContent = "";
          try {
            const rawRes = await fetch(
              `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodeURIComponent(customCiPath)}/raw?ref=${branch}`,
              { headers: { Authorization: `Bearer ${account.accessToken}` } }
            );
            if (rawRes.ok) {
              mainCiContent = await rawRes.text(); // ได้เนื้อหา YAML มาเป็น String ยาวๆ
            }
          } catch (e) {
            console.error("Failed to fetch main CI content:", e);
          }

          // 🔥 2. ดึง Tree แบบลึก
          const apiUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/tree?ref=${branch}&recursive=true&per_page=100`;
          const glRes = await fetch(apiUrl, {
            method: "GET",
            headers: { Authorization: `Bearer ${account.accessToken}` },
          });

          if (glRes.ok) {
            const files = await glRes.json();
            if (Array.isArray(files)) {
              
              // 🔥 3. อัปเกรดตัวกรอง (Filter) ด้วยเวทมนตร์ Includes
              const ymlFiles = files.filter((f: any) => {
                if (f.type !== "blob") return false;
                
                const lowerPath = f.path.toLowerCase();
                const isYaml = lowerPath.endsWith(".yml") || lowerPath.endsWith(".yaml");
                if (!isYaml) return false;

                // เงื่อนไขที่ 1: เป็นไฟล์หลัก (พระเอก)
                const isMainFile = lowerPath === lowerCustomPath;
                // เงื่อนไขที่ 2: อยู่ในโฟลเดอร์มาตรฐาน
                const isStandardDir = lowerPath.startsWith(".gitlab/ci/");
                // เงื่อนไขที่ 3 [เวทมนตร์]: ชื่อ Path ของไฟล์นี้ ถูกเขียนเรียกไว้ในไฟล์หลัก!
                // (ใช้รวมถึงไฟล์ใน Root เช่น include: local: 'deploy.yml')
                const isMentionedInMain = mainCiContent.includes(f.path) || mainCiContent.includes(f.name);

                // ถ้าเข้าข่ายข้อใดข้อหนึ่ง ให้ผ่าน!
                return isMainFile || isStandardDir || isMentionedInMain;
              });
              
              ymlFiles.forEach((f: any) => {
                gitFiles.push({
                  fileName: f.name, 
                  fullPath: f.path,
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
