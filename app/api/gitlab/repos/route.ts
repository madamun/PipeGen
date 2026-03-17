import { NextRequest } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "gitlab" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) {
    return Response.json({ error: "No GitLab access token" }, { status: 400 });
  }

  // 🦊 1. เช็กว่าหน้าเว็บขอดูข้อมูล "ทั้งหมด" (ตอนเปิด Popup) ใช่หรือไม่?
  const url = new URL(req.url);
  const fetchAll = url.searchParams.get("all") === "true";

  const userRes = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  });
  const userData = await userRes.json();
  const realUsername = userData.username;

  const glRes = await fetch(
    "https://gitlab.com/api/v4/projects?membership=true&simple=true&order_by=updated_at",
    { headers: { Authorization: `Bearer ${account.accessToken}` } }
  );

  if (!glRes.ok) return Response.json({ error: "GitLab API Error" }, { status: glRes.status });
  const projects = await glRes.json();

  // 2. ดึง ID ที่ผู้ใช้เคยอนุญาตไว้จาก Database ของเรา
  const allowedReposInDb = await prisma.repository.findMany({
    where: { userId: session.user.id, provider: "gitlab" },
    select: { providerRepoId: true },
  });
  const allowedIds = allowedReposInDb.map((r) => r.providerRepoId).filter(Boolean) as string[];

  // 🦊 3. ถ้า fetchAll เป็น true (เปิด Popup) ให้โชว์ทั้งหมด 
  // แต่ถ้าเป็น false (โชว์หน้าหลัก) ให้กรองเฉพาะอันที่เคยเซฟไว้
  const filteredProjects = fetchAll 
    ? projects 
    : projects.filter((p: any) => allowedIds.includes(String(p.id)));

  const repos = filteredProjects.map((p: any) => ({
    id: String(p.id),
    name: p.name,
    full_name: p.path_with_namespace,
    default_branch: p.default_branch || "main",
    private: p.visibility === "private",
    html_url: p.web_url,
    provider: "gitlab",
    stargazers_count: p.star_count,
    forks_count: p.forks_count,
    updated_at: p.last_activity_at,
    owner: {
      login: p.namespace.path,
      avatar_url: p.avatar_url || session.user.image,
    },
    _meta: { branchCount: 0, tagCount: 0, pipelineCount: 0, languages: [] },
  }));

  return Response.json({
    me: { login: realUsername, avatar_url: session.user.image },
    repos: repos,
    allowedIds: allowedIds, // ส่งกลับไปบอก Popup ด้วยว่าติ๊กอันไหนไว้บ้าง
  });
}

// 🦊 4. เพิ่มฟังก์ชัน POST สำหรับรับค่าจากหน้า Popup มาเซฟลง Database
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { selectedRepos } = await req.json(); // จะได้ Array ของ { id, full_name } มาจาก Popup

    // ลบข้อมูล GitLab เก่าของ User นี้ทิ้งให้หมดก่อน (เพื่อรีเซ็ตค่า)
    await prisma.repository.deleteMany({
      where: { userId: session.user.id, provider: "gitlab" },
    });

    // Insert ข้อมูลใหม่ที่เพิ่งติ๊กเลือกเข้ามา
    if (selectedRepos && selectedRepos.length > 0) {
      await prisma.repository.createMany({
        data: selectedRepos.map((r: any) => ({
          userId: session.user.id,
          provider: "gitlab",
          providerRepoId: String(r.id),
          fullName: r.full_name,
        })),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save repositories" }, { status: 500 });
  }
}