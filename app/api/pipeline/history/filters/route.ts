// app/api/pipeline/history/filters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../packages/server/prisma";
import { auth } from "../../../../../packages/server/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. ดึง Repo ที่ user มี access จริงจาก Provider API
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { providerId: true, accessToken: true },
    });

    const accessibleRepos = new Set<string>();

    for (const acc of accounts) {
      if (!acc.accessToken) continue;
      try {
        if (acc.providerId === "github") {
          const res = await fetch("https://api.github.com/installation/repositories?per_page=100", {
            headers: { Authorization: `Bearer ${acc.accessToken}`, Accept: "application/vnd.github+json" },
          });
          if (res.ok) {
            const data = await res.json();
            (data.repositories || []).forEach((r: any) => accessibleRepos.add(r.full_name));
          }
        } else if (acc.providerId === "gitlab") {
          // GitLab: ดึงจาก allowedGitlabRepos ใน DB
          const allowedRepos = await prisma.repository.findMany({
            where: { userId, provider: "gitlab" },
            select: { fullName: true },
          });
          allowedRepos.forEach((r) => accessibleRepos.add(r.fullName));
        }
      } catch (e) {
        console.error(`Failed to fetch repos from ${acc.providerId}:`, e);
      }
    }

    // fallback: ถ้า API fail ใช้ Repository table แทน
    if (accessibleRepos.size === 0) {
      const repos = await prisma.repository.findMany({
        where: { userId },
        select: { fullName: true },
      });
      repos.forEach((r) => accessibleRepos.add(r.fullName));
    }

    // 2. ดึงชื่อ Branch ที่เคยมีประวัติการทำรายการ
    const historyBranches = await prisma.pipelineHistory.findMany({
      where: { userId: userId },
      select: { repoFullName: true, branch: true },
      distinct: ["repoFullName", "branch"],
    });

    // 3. ประกอบร่างข้อมูล 
    const filters: Record<string, string[]> = {};

    // ตั้งต้นโครงสร้างด้วย Repo ที่ user มี access จริง
    for (const repoName of accessibleRepos) {
      filters[repoName] = [];
    }

    // เอา Branch ไปหย่อนใส่ Repo ที่ตรงกัน
    for (const hb of historyBranches) {
      if (!filters[hb.repoFullName]) continue;  // skip repo ที่ไม่มี access แล้ว
      if (hb.branch && !filters[hb.repoFullName].includes(hb.branch)) {
        filters[hb.repoFullName].push(hb.branch);
      }
    }

    return NextResponse.json({ filters });
  } catch (error) {
    console.error("Fetch filters error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}