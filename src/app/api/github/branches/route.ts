// src/app/api/github/branches/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic"; // บังคับให้รันฝั่งเซิร์ฟเวอร์ทุกครั้ง
export const runtime = "nodejs";

type GhBranch = { name: string; protected?: boolean };

export async function GET(req: NextRequest) {
  // 1) ตรวจสอบ session จาก Better Auth
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 2) ดึงพารามิเตอร์ full_name (เช่น "owner/repo")
  const { searchParams } = new URL(req.url);
  const fullName = searchParams.get("full_name");
  if (!fullName) {
    return Response.json({ error: "Missing full_name" }, { status: 400 });
  }
  // 3) อ่าน GitHub access token ของผู้ใช้จากฐานข้อมูล (Prisma)
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) {
    return Response.json({ error: "No GitHub access token on account" }, { status: 400 });
  }
  // 4) เรียก GitHub API เพื่อดึงรายชื่อ branch
  const ghHeaders = {
    Authorization: `Bearer ${account.accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "pipe-gen-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const url = `https://api.github.com/repos/${fullName}/branches?per_page=100`;
  const res = await fetch(url, { headers: ghHeaders });
  const branches: GhBranch[] = await res.json();
  const names = branches.map(b => ({ name: b.name, protected: !!b.protected }));
  // 5) ส่งข้อมูลกลับในรูปแบบที่ฝั่ง UI นำไปใช้ได้ทันที
  return Response.json({ branches: names });
}


