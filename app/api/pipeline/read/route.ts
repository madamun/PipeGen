import { NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";

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

    // ดึง repo เพื่อรู้ provider
    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    const provider = repo?.provider || "github";

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider },
      select: { accessToken: true },
    });

    if (!account?.accessToken) {
      return NextResponse.json({ content: "" });
    }

    if (provider === "gitlab") {
      const encodedId = encodeURIComponent(repoFullName);
      const encodedPath = encodeURIComponent(filePath);
      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}/raw?ref=${branch}`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } },
      );
      if (!res.ok) return NextResponse.json({ content: "" });
      const content = await res.text();
      return NextResponse.json({ content, source: "gitlab" });
    }

    // GitHub
    const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`;
    const ghRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });

    if (!ghRes.ok) return NextResponse.json({ content: "" });

    const data = await ghRes.json();
    if (data.content && data.encoding === "base64") {
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      return NextResponse.json({ content: decoded, source: "github" });
    }

    return NextResponse.json({ content: "" });
  } catch (error) {
    console.error("Read error:", error);
    return NextResponse.json({ error: "Failed to read" }, { status: 500 });
  }
}