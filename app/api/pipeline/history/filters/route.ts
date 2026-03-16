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

    // 1. ดึงชื่อ Repo ทั้งหมดที่ User คนนี้เชื่อมต่อไว้
    const repos = await prisma.repository.findMany({
      where: { userId: userId },
      select: { fullName: true },
    });

    // 2. ดึงชื่อ Branch ที่เคยมีประวัติการทำรายการ
    const historyBranches = await prisma.pipelineHistory.findMany({
      where: { userId: userId },
      select: { repoFullName: true, branch: true },
      distinct: ["repoFullName", "branch"],
    });

    // 3. ประกอบร่างข้อมูล 
    const filters: Record<string, string[]> = {};

    // ตั้งต้นโครงสร้างด้วย Repo ทั้งหมดของ User
    for (const r of repos) {
      filters[r.fullName] = [];
    }

    // เอา Branch ไปหย่อนใส่ Repo ที่ตรงกัน
    for (const hb of historyBranches) {
      // เผื่อกรณีที่ Repo โดนลบไปแล้ว แต่ประวัติ History ยังอยู่
      if (!filters[hb.repoFullName]) {
        filters[hb.repoFullName] = [];
      }
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