// src/app/api/pipeline/files/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get("repoFullName");
    const branch = searchParams.get("branch") || "main";

    if (!repoFullName) return NextResponse.json({ error: "Missing repo" }, { status: 400 });

    // 1. หา Repo ID
    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id }
    });

    // เตรียมตัวแปรเก็บผลลัพธ์
    let drafts: any[] = [];
    let gitFiles: any[] = [];

    // 2. ดึง Drafts จาก Database (งานที่ค้างอยู่)
    if (repo) {
      const dbPipelines = await prisma.pipeline.findMany({
        where: { 
          repoId: repo.id, 
          branch: branch,
          // เอาเฉพาะที่มี Draft หรือเป็นไฟล์ใหม่ที่ยังไม่มีใน Git
          drafts: { some: {} } 
        },
        select: { filePath: true, name: true, updatedAt: true }
      });

      drafts = dbPipelines.map(p => ({
        fileName: p.name,
        fullPath: p.filePath,
        source: 'draft' // แปะป้ายว่าเป็น Draft
      }));
    }

    // 3. ดึงไฟล์จาก GitHub (ไฟล์ต้นฉบับ)
    try {
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id, providerId: "github" }
        });
        
        if (account?.accessToken) {
            const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/.github/workflows?ref=${branch}`, {
                headers: { "Authorization": `Bearer ${account.accessToken}` }
            });
            
            if (ghRes.ok) {
                const data = await ghRes.json();
                if (Array.isArray(data)) {
                     // กรองเอาเฉพาะไฟล์ .yml / .yaml
                     const allGitFiles = data
                        .filter((f: any) => f.name.endsWith('.yml') || f.name.endsWith('.yaml'))
                        .map((f: any) => ({
                            fileName: f.name,
                            fullPath: f.path,
                            source: 'git' // แปะป้ายว่าเป็น Git
                        }));

                     // 4. 🔥 Logic เด็ด: ตัดไฟล์ที่มี Draft แล้ว ออกจากกลุ่ม Git
                     // (จะได้ไม่โชว์ซ้ำ 2 ที่ ถ้ามี Draft ให้ถือว่าเป็น Draft)
                     const draftPaths = new Set(drafts.map(d => d.fullPath));
                     gitFiles = allGitFiles.filter(f => !draftPaths.has(f.fullPath));
                }
            }
        }
    } catch (e) {
        console.error("Git fetch error:", e);
    }

    // ส่งกลับไปทั้ง 2 กลุ่ม
    return NextResponse.json({ 
        drafts, 
        gitFiles 
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}