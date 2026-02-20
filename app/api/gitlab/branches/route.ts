// src/app/api/gitlab/branches/route.ts

import { NextRequest } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. รับค่า repo full_name จาก URL query
  const { searchParams } = new URL(req.url);
  const fullName = searchParams.get("full_name"); // เช่น "suttikiet/my-test-lab"

  if (!fullName) {
    return Response.json({ error: "Missing full_name" }, { status: 400 });
  }

  // 2. Check Session
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 3. Get GitLab Token
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "gitlab" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) {
    return Response.json({ error: "No GitLab access token" }, { status: 400 });
  }

  try {
    // 4. Call GitLab API (ดึง Branch)
    // GitLab API ใช้ ID หรือ URL Encoded Path
    const encodedPath = encodeURIComponent(fullName);
    const glRes = await fetch(
      `https://gitlab.com/api/v4/projects/${encodedPath}/repository/branches`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      },
    );

    if (!glRes.ok) {
      // ถ้าหาไม่เจอ หรือ Error
      return Response.json({ branches: [] });
    }

    const branchesData = await glRes.json();

    // 5. Map ข้อมูลให้ตรงกับที่หน้าบ้านอยากได้
    const branches = branchesData.map((b: any) => ({
      name: b.name,
      commit: { sha: b.commit.id },
    }));

    return Response.json({ branches });
  } catch (error) {
    console.error("GitLab Branches Error:", error);
    return Response.json(
      { error: "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
