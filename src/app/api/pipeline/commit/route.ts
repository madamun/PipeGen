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

    // 1. หา Token
    const account = await prisma.account.findFirst({
        where: { userId: session.user.id, providerId: "github" }
    });
    if (!account?.accessToken) return NextResponse.json({ error: "No GitHub token" }, { status: 401 });

    const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;

    // 2. เช็คก่อนว่าไฟล์มีอยู่แล้วไหม? (เพื่อเอา SHA)
    // ถ้าไม่มี SHA = Create New File, ถ้ามี SHA = Update File
    let sha = null;
    try {
        const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
            headers: { "Authorization": `Bearer ${account.accessToken}` }
        });
        if (getRes.ok) {
            const getData = await getRes.json();
            sha = getData.sha;
        }
    } catch (e) { /* ignore error, assume new file */ }

    // 3. ยิง PUT เพื่อ Save ลง GitHub
    const body: any = {
        message: message,
        content: Buffer.from(content).toString('base64'), // ต้องแปลงเป็น Base64
        branch: branch || "main"
    };
    if (sha) body.sha = sha; // ถ้าเป็นการแก้ไฟล์เดิม ต้องส่ง SHA ไปด้วย

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

    // 4. ✅ Commit สำเร็จ -> ลบ Draft ใน DB ทิ้ง (เพราะถือว่า Sync แล้ว)
    const repo = await prisma.repository.findFirst({
        where: { fullName: repoFullName, userId: session.user.id }
    });

    if (repo) {
        const pipeline = await prisma.pipeline.findFirst({
            where: { repoId: repo.id, filePath: filePath, branch: branch }
        });

        if (pipeline) {
            // ลบ Draft ทิ้ง
            await prisma.pipelineDraft.deleteMany({
                where: { pipelineId: pipeline.id }
            });
        }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}