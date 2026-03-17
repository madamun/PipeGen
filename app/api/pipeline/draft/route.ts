// src/app/api/pipeline/draft/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

// ==========================================
// 💾 POST: บันทึก Draft (Auto Save)
// ==========================================
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user;
    const body = await req.json();

    // รับค่า branch มาด้วย
    const { repoFullName, filePath, content, branch } = body;
    const targetBranch = branch || "main";

    // 1. หา/สร้าง Repo
    let repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: user.id },
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          userId: user.id,
          fullName: repoFullName,
          provider: "github",
          providerRepoId: "unknown",
        },
      });
    }

    // 2. หา Pipeline (ค้นหาเฉพาะใน Branch ที่เลือก)
    let pipeline = await prisma.pipeline.findFirst({
      where: {
        repoId: repo.id,
        filePath: filePath,
        branch: targetBranch,
      },
    });

    if (!pipeline) {
      // ถ้ายังไม่มีใน Branch นี้ ให้สร้างใหม่
      pipeline = await prisma.pipeline.create({
        data: {
          repoId: repo.id,
          createdById: user.id,
          name: filePath.split("/").pop() || "pipeline",
          filePath,
          branch: targetBranch,
        },
      });
    }

    // 3. บันทึก Draft
    const safeContent = content || "";

    const draft = await prisma.pipelineDraft.upsert({
      where: { pipelineId: pipeline.id },
      update: { configuration: safeContent, updatedAt: new Date() },
      create: {
        pipeline: { connect: { id: pipeline.id } }, // ใช้ connect เพื่อความชัวร์
        configuration: safeContent,
      },
    });

    return NextResponse.json({ success: true, savedAt: draft.updatedAt });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// ==========================================
// 📥 GET: ดึงเนื้อหาไฟล์ (DB -> GitHub)
// ==========================================
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get("repoFullName");
    const branch = searchParams.get("branch") || "main";
    const filePath = searchParams.get("filePath");

    if (!repoFullName || !filePath) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // 1. 🔍 เช็ค DB ก่อน (เผื่อมี Draft ค้างไว้)
    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    if (repo) {
      const pipeline = await prisma.pipeline.findFirst({
        where: { repoId: repo.id, filePath: filePath, branch: branch },
        include: { drafts: true },
      });

      // ถ้ามี Draft เอา Draft มาโชว์ (drafts เป็น relation 1:1 ไม่ใช่ array)
      if (pipeline?.drafts?.configuration !== undefined) {
        return NextResponse.json({
          content: pipeline.drafts.configuration,
          source: "draft",
          updatedAt: pipeline.drafts.updatedAt,
        });
      }
    }

// 2. 🌍 ถ้า DB ไม่มี -> ไปดึงจาก Git (รองรับทั้ง GitHub + GitLab)
    const provider = repo?.provider || "github";

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider },
    });

    if (!account?.accessToken) {
      return NextResponse.json({ content: `# Error: ${provider} Token not found` });
    }

    if (provider === "gitlab") {
      // 🦊 GitLab: ใช้ raw file API
      const encodedId = encodeURIComponent(repoFullName);
      const encodedPath = encodeURIComponent(filePath);
      const glRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}/raw?ref=${branch}`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } },
      );

      if (!glRes.ok) {
        return NextResponse.json({ content: "", source: "new" });
      }

      const content = await glRes.text();
      return NextResponse.json({ content, source: "gitlab" });

    } else {
      // GitHub: ใช้ contents API (เหมือนเดิม)
      const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`;
      const ghRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });

      if (!ghRes.ok) {
        return NextResponse.json({ content: "", source: "new" });
      }

      const data = await ghRes.json();
      if (data.content && data.encoding === "base64") {
        const decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
        return NextResponse.json({ content: decodedContent, source: "github" });
      }

      return NextResponse.json({ content: "", source: "unknown" });
    }
  } catch (error) {
    console.error("Load Error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// ==========================================
// 🗑️ DELETE: ลบ Draft (Discard Changes)
// ==========================================
export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, filePath, branch } = await req.json();

    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    if (repo) {
      const pipeline = await prisma.pipeline.findFirst({
        where: { repoId: repo.id, filePath: filePath, branch: branch },
      });

      if (pipeline) {
        // ลบ Draft ออก
        await prisma.pipelineDraft.deleteMany({
          where: { pipelineId: pipeline.id },
        });

        // (Optional) ถ้าเป็นไฟล์ใหม่ที่ยังไม่เคยมีใน Git จะลบ Pipeline record ทิ้งไปด้วยก็ได้
        // เพื่อไม่ให้มันค้างชื่อในระบบ แต่ตอนนี้เอาแค่ลบ Draft ก่อนก็พอ
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
