import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function POST(req: Request) {
  try {
    // 1. เช็ค Auth
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, branch } = await req.json(); // รับค่า branch มาด้วย
    const targetBranch = branch || "main";

    // 2. ดึง Access Token ของ User เพื่อไปคุยกับ GitHub
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "github" }
    });
    
    if (!account?.accessToken) return NextResponse.json({ error: "No GitHub Token" }, { status: 400 });

    // 3. ยิง GitHub API ไปขอรายชื่อไฟล์ในโฟลเดอร์ workflows (ตาม Branch ที่เลือก)
    const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/.github/workflows?ref=${targetBranch}`, {
      headers: { 
        Authorization: `Bearer ${account.accessToken}`,
        "Accept": "application/vnd.github+json"
      }
    });

    if (ghRes.status === 404) {
      // ถ้าไม่เจอโฟลเดอร์นี้ แสดงว่ายังไม่มี Pipeline เลย
      return NextResponse.json({ count: 0, message: "No pipelines found" });
    }

    const files = await ghRes.json();
    if (!Array.isArray(files)) return NextResponse.json({ error: "Invalid response from GitHub" }, { status: 500 });

    // 4. เตรียม Repo (Find or Create)
    let repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id }
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          userId: session.user.id,
          fullName: repoFullName,
          provider: "github",
          providerRepoId: "unknown"
        }
      });
    }
    
    const repoId = repo.id;

    // 5. วนลูปบันทึกลง Database (เฉพาะไฟล์ .yml / .yaml)
    let count = 0;
    
    await Promise.all(files.map(async (file: any) => {
      if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
        
        // Upsert: มีแล้ว update, ยังไม่มี create
        await prisma.pipeline.upsert({
          where: { 
            // ใช้ Unique Constraint ที่เราเพิ่งทำ (repoId + filePath + branch)
            repoId_filePath_branch: { 
               repoId: repoId, 
               filePath: file.path,
               branch: targetBranch
            }
          },
          update: { updatedAt: new Date() }, // แค่ update เวลา
          create: {
            repoId: repoId,
            createdById: session.user.id,
            name: file.name,
            filePath: file.path,
            branch: targetBranch
          }
        });
        count++;
      }
    }));

    return NextResponse.json({ success: true, count });

  } catch (error) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}