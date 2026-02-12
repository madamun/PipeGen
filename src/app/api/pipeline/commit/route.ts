// src/app/api/pipeline/commit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, filePath, content, message, branch } = await req.json();

    if (!repoFullName || !filePath || !content || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. ✅ หา Repository ใน DB ก่อน เพื่อดูว่าเป็น provider ไหน
    const repo = await prisma.repository.findFirst({
        where: { fullName: repoFullName, userId: session.user.id }
    });

    if (!repo) return NextResponse.json({ error: "Repository not found in DB" }, { status: 404 });

    const provider = repo.provider; // "github" หรือ "gitlab"

    // 2. ดึง Token ตาม Provider
    const account = await prisma.account.findFirst({
        where: { userId: session.user.id, providerId: provider }
    });
    
    if (!account?.accessToken) return NextResponse.json({ error: `No ${provider} token` }, { status: 401 });

    // ----------------------------------------------------
    // 🐙 GITHUB LOGIC
    // ----------------------------------------------------
    if (provider === "github") {
        const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
        
        // เช็ค SHA
        let sha = null;
        try {
            const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
                headers: { "Authorization": `Bearer ${account.accessToken}` }
            });
            if (getRes.ok) {
                const getData = await getRes.json();
                sha = getData.sha;
            }
        } catch (e) {}

        const body: any = {
            message: message,
            content: Buffer.from(content).toString('base64'),
            branch: branch || "main"
        };
        if (sha) body.sha = sha;

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {  
                "Authorization": `Bearer ${account.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            return NextResponse.json({ error: "GitHub Error: " + errText }, { status: 500 });
        }
    }
    
    // ----------------------------------------------------
    // 🦊 GITLAB LOGIC (แบบย่อ สำหรับ Quick Save)
    // ----------------------------------------------------
    else if (provider === "gitlab") {
        const encodedId = encodeURIComponent(repoFullName);
        const encodedPath = encodeURIComponent(filePath);

        // เช็คว่ามีไฟล์ไหม (HEAD)
        let action = "create";
        const checkRes = await fetch(
            `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}?ref=${branch}`,
            {
                method: "HEAD",
                headers: { "Authorization": `Bearer ${account.accessToken}` }
            }
        );
        if (checkRes.ok) action = "update";

        // Commit
        const commitRes = await fetch(`https://gitlab.com/api/v4/projects/${encodedId}/repository/commits`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${account.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                branch: branch || "main",
                commit_message: message,
                actions: [{
                    action: action,
                    file_path: filePath,
                    content: content
                }]
            })
        });

        if (!commitRes.ok) {
             const err = await commitRes.json();
             return NextResponse.json({ error: "GitLab Error: " + (err.message || JSON.stringify(err)) }, { status: 500 });
        }
    }

    // ----------------------------------------------------
    // 3. Cleanup: ลบ Draft ทิ้งหลังจาก Save สำเร็จ (ใช้ Logic เดิม)
    // ----------------------------------------------------
    const pipeline = await prisma.pipeline.findFirst({
        where: { repoId: repo.id, filePath: filePath, branch: branch }
    });

    if (pipeline) {
        await prisma.pipelineDraft.deleteMany({
            where: { pipelineId: pipeline.id }
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}