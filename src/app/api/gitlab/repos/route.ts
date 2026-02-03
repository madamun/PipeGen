// src/app/api/gitlab/repos/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

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

  // 1. ดึงข้อมูล User ปัจจุบันจาก GitLab (เพื่อเอา Username จริงๆ)
  const userRes = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  });
  const userData = await userRes.json();
  const realUsername = userData.username; // ได้ชื่อจริงแล้ว เช่น "suttikiet"

  // 2. ดึง Projects
  const glRes = await fetch(
    "https://gitlab.com/api/v4/projects?membership=true&simple=true&order_by=updated_at",
    {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    }
  );

  if (!glRes.ok) {
    return Response.json({ error: "GitLab API Error" }, { status: glRes.status });
  }

  const projects = await glRes.json();

const repos = projects.map((p: any) => ({
    id: String(p.id),
    name: p.name,
    full_name: p.path_with_namespace,
    default_branch: p.default_branch || "main",
    private: p.visibility === "private",
    html_url: p.web_url,
    provider: "gitlab",
    
    // 👇 แก้ตรงนี้ครับ: Map ชื่อ field ของ GitLab ให้เข้ากับ Type ของเรา
    stargazers_count: p.star_count, // GitLab ใช้ star_count
    forks_count: p.forks_count,     // GitLab ใช้ forks_count
    
    updated_at: p.last_activity_at, // เอาเวลาแก้ไขล่าสุดมาด้วยก็ได้
    
    owner: {
        login: p.namespace.path, 
        avatar_url: p.avatar_url || session.user.image
    },
    
    // ส่วน Meta พวกนี้ปล่อยเป็น null หรือ 0 ไปครับ (เพื่อ Performance)
    _meta: {
        branchCount: 0, 
        tagCount: 0, 
        pipelineCount: 0,
        languages: [] 
    }
  }));

  return Response.json({ 
    // ส่ง realUsername กลับไปแทน session.user.name
    me: { login: realUsername, avatar_url: session.user.image },
    repos: repos 
  });
}