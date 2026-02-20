// src/app/api/pipeline/read/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth"; // 👈 เช็ค path auth ให้ถูกนะครับ

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. ตรวจสอบ Session (Better Auth ใช้ headers)
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get("repoFullName");
    const filePath = searchParams.get("filePath");
    const branch = searchParams.get("branch") || "main";

    console.log(`📖 Reading File: ${repoFullName} (${branch}) - ${filePath}`);

    if (!repoFullName || !filePath)
      return NextResponse.json({ content: "# Error: Missing parameters" });

    // 2. หา Repo ใน DB
    const repo = await prisma.repository.findFirst({
      where: { fullName: repoFullName, userId: session.user.id },
    });

    if (!repo) {
      console.log("❌ Repo not found in DB");
      return NextResponse.json({
        content: "# Error: Repository not found in DB",
      });
    }

    const provider = repo.provider;
    console.log(`🔹 Repo Provider in DB is: "${provider}"`);

    // 3. หา Token
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider },
    });

    if (!account?.accessToken) {
      console.log(`❌ No Token for ${provider}`);
      return NextResponse.json({
        content: `# Error: ${provider} Access Token not found (Check your login).`,
      });
    }

    // 4. ดึงเนื้อหา
    let content = "";
    try {
      if (provider === "github") {
        const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`;
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        });

        // 🔥 FIX: เพิ่มตรงนี้ครับ! ถ้าไม่เจอไฟล์ ให้ตอบว่างๆ กลับไป (อย่า Throw Error)
        if (res.status === 404) {
          console.log("ℹ️ GitHub: File not found (New file)");
          return NextResponse.json({ content: "" });
        }

        if (!res.ok) throw new Error(`GitHub Status: ${res.status}`);

        const data = await res.json();
        // GitHub ส่งมาเป็น Base64 ต้องแปลงกลับ
        if (data.content) {
          content = Buffer.from(data.content, "base64").toString("utf-8");
        } else {
          content = ""; // กรณีไฟล์ว่างเปล่าจริงๆ
        }
      } else if (provider === "gitlab") {
        const encodedId = encodeURIComponent(repoFullName);
        const encodedPath = encodeURIComponent(filePath);
        const apiUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}/raw?ref=${branch}`;
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        });

        // ✅ ของ GitLab คุณทำถูกแล้ว
        if (!res.ok) {
          if (res.status === 404) {
            console.log("ℹ️ GitLab: File not found (New file)");
            return NextResponse.json({ content: "" });
          }
          throw new Error(`GitLab Status: ${res.status}`);
        }
        content = await res.text();
      }
    } catch (e: any) {
      console.error("Fetch Error:", e);
      // ถ้า Error จริงๆ (ไม่ใช่ 404) ให้ส่ง Error กลับไปโชว์
      return NextResponse.json({
        content: `# Error fetching file: ${e.message}`,
      });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ content: "# Error: Internal Server Error" });
  }
}
