// src/app/api/pipeline/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // รับค่า provider มาด้วย (สำคัญมาก)
    const { repoFullName, branch, provider = "github" } = await req.json();
    const targetBranch = branch || "main";

    if (!repoFullName)
      return NextResponse.json({ error: "Missing repo name" }, { status: 400 });

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider },
    });

    if (!account?.accessToken)
      return NextResponse.json(
        { error: `No ${provider} Token` },
        { status: 400 },
      );

    // 1. ค้นหาไฟล์ (เหมือนเดิม)
    let foundFiles: { name: string; path: string }[] = [];

    if (provider === "github") {
      const ghRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/.github/workflows?ref=${targetBranch}`,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (ghRes.ok) {
        const files = await ghRes.json();
        if (Array.isArray(files)) {
          foundFiles = files
            .filter(
              (f: any) => f.name.endsWith(".yml") || f.name.endsWith(".yaml"),
            )
            .map((f: any) => ({ name: f.name, path: f.path }));
        }
      }
    } else if (provider === "gitlab") {
      const encodedPath = encodeURIComponent(repoFullName);
      const glRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedPath}/repository/files/.gitlab-ci.yml?ref=${targetBranch}`,
        {
          method: "HEAD",
          headers: { Authorization: `Bearer ${account.accessToken}` },
        },
      );
      if (glRes.ok) {
        foundFiles.push({ name: ".gitlab-ci.yml", path: ".gitlab-ci.yml" });
      }
    }

    if (foundFiles.length === 0) {
      return NextResponse.json({ count: 0, message: "No pipelines found" });
    }

    // -------------------------------------------------------
    // 🔥 FIX KEY: จัดการ Repo ใน DB ให้ถูกต้อง
    // -------------------------------------------------------
    let repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    if (repo) {
      // ✅ ถ้าเจอของเก่า แต่ Provider ไม่ตรง (เช่นของเก่าเป็น github แต่รอบนี้มาเป็น gitlab)
      // ให้ UPDATE แก้ไขทันที!
      if (repo.provider !== provider) {
        console.log(
          `🔄 Updating repo provider from ${repo.provider} to ${provider}`,
        );
        repo = await prisma.repository.update({
          where: { id: repo.id },
          data: { provider: provider },
        });
      }
    } else {
      // ถ้ายังไม่มี ก็สร้างใหม่
      repo = await prisma.repository.create({
        data: {
          userId: session.user.id,
          fullName: repoFullName,
          provider: provider,
          providerRepoId: "unknown",
        },
      });
    }

    const repoId = repo.id;

    // 2. บันทึก Pipeline ลง DB (เหมือนเดิม)
    let count = 0;
    await Promise.all(
      foundFiles.map(async (file) => {
        await prisma.pipeline.upsert({
          where: {
            repoId_filePath_branch: {
              repoId: repoId,
              filePath: file.path,
              branch: targetBranch,
            },
          },
          update: { updatedAt: new Date() },
          create: {
            repoId: repoId,
            createdById: session.user.id,
            name: file.name,
            filePath: file.path,
            branch: targetBranch,
          },
        });
        count++;
      }),
    );

    return NextResponse.json({ success: true, count, provider });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500 },
    );
  }
}
