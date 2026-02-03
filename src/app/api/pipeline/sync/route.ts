import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. เช็ค Auth
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ รับ provider เข้ามาด้วย (ถ้าไม่มีให้ Default เป็น github)
    const { repoFullName, branch, provider = "github" } = await req.json(); 
    const targetBranch = branch || "main";

    if (!repoFullName) return NextResponse.json({ error: "Missing repo name" }, { status: 400 });

    // 2. ดึง Access Token ตาม Provider (GitHub หรือ GitLab)
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider }
    });
    
    if (!account?.accessToken) return NextResponse.json({ error: `No ${provider} Token` }, { status: 400 });

    // ตัวแปรสำหรับเก็บรายชื่อไฟล์ที่เจอ
    let foundFiles: { name: string; path: string }[] = [];

    // -------------------------------------------------------
    // 🐙 GitHub Logic: หาไฟล์ใน .github/workflows
    // -------------------------------------------------------
    if (provider === "github") {
      const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/.github/workflows?ref=${targetBranch}`, {
        headers: { 
          Authorization: `Bearer ${account.accessToken}`,
          "Accept": "application/vnd.github+json"
        }
      });

      if (ghRes.ok) {
        const files = await ghRes.json();
        if (Array.isArray(files)) {
          // กรองเอาเฉพาะ .yml / .yaml
          foundFiles = files
            .filter((f: any) => f.name.endsWith('.yml') || f.name.endsWith('.yaml'))
            .map((f: any) => ({ name: f.name, path: f.path }));
        }
      } else if (ghRes.status !== 404) {
         // ถ้า Error อื่นที่ไม่ใช่ 404 (ไม่เจอโฟลเดอร์) ให้แจ้งเตือน
         console.error("GitHub Sync Error:", await ghRes.text());
      }
    }

    // -------------------------------------------------------
    // 🦊 GitLab Logic: หาไฟล์ .gitlab-ci.yml (ตัวหลัก)
    // -------------------------------------------------------
    else if (provider === "gitlab") {
      const encodedPath = encodeURIComponent(repoFullName);
      // ใช้ HEAD request เพื่อเช็คว่ามีไฟล์อยู่จริงไหม (ประหยัดกว่า GET content)
      const glRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedPath}/repository/files/.gitlab-ci.yml?ref=${targetBranch}`,
        {
            method: "HEAD", 
            headers: { Authorization: `Bearer ${account.accessToken}` }
        }
      );

      if (glRes.ok) {
        // ถ้าเจอไฟล์นี้ ถือว่ามี Pipeline
        foundFiles.push({
            name: ".gitlab-ci.yml",
            path: ".gitlab-ci.yml"
        });
      }
    }

    // ถ้าไม่เจอไฟล์อะไรเลย
    if (foundFiles.length === 0) {
      return NextResponse.json({ count: 0, message: "No pipelines found" });
    }

    // -------------------------------------------------------
    // 4. เตรียม Repo (Find or Create)
    // -------------------------------------------------------
    let repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id, provider }
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          userId: session.user.id,
          fullName: repoFullName,
          provider: provider, // ✅ บันทึก provider ให้ถูก
          providerRepoId: "unknown"
        }
      });
    }
    
    const repoId = repo.id;

    // -------------------------------------------------------
    // 5. วนลูปบันทึกลง Database
    // -------------------------------------------------------
    let count = 0;
    
    await Promise.all(foundFiles.map(async (file) => {
        // Upsert: มีแล้ว update, ยังไม่มี create
        await prisma.pipeline.upsert({
          where: { 
            // ใช้ Unique Constraint (repoId + filePath + branch)
            repoId_filePath_branch: { 
               repoId: repoId, 
               filePath: file.path,
               branch: targetBranch
            }
          },
          update: { 
              updatedAt: new Date(),
              status: "ACTIVE" // ปรับสถานะกลับมา Active เผื่อเคยถูกลบ
          }, 
          create: {
            repoId: repoId,
            createdById: session.user.id,
            name: file.name,
            filePath: file.path,
            branch: targetBranch,
            status: "ACTIVE"
          }
        });
        count++;
    }));

    return NextResponse.json({ success: true, count, provider });

  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: "Sync failed", details: error.message }, { status: 500 });
  }
}