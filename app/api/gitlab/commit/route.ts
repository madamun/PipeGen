// app/api/gitlab/commit/route.ts
import { NextRequest } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  full_name: string; // "namespace/project"
  baseBranch: string; // "main" (used as base when creating new branch)
  branch: string; // target branch (existing = update, new = create then commit)
  mode: "push" | "pull_request";
  title: string;
  message: string;
  path: string; // e.g. ".gitlab-ci.yml"
  content: string; // file content (YAML string)
};

const VALID_BRANCH_REGEX = /^[a-zA-Z0-9/_.-]+$/;
function isValidBranchName(name: string): boolean {
  const t = name.trim();
  return t.length > 0 && t.length <= 200 && VALID_BRANCH_REGEX.test(t);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const { full_name, baseBranch, branch: targetBranch, mode, title, message, path, content } = body;

  if (!full_name || !baseBranch || !path || !content) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const branch = (targetBranch || baseBranch).trim();
  if (!branch) {
    return Response.json({ error: "Branch name is required" }, { status: 400 });
  }
  if (!isValidBranchName(branch)) {
    return Response.json(
      { error: "Branch name can only use letters, numbers, /, -, _, and ." },
      { status: 400 },
    );
  }

  // 1. ดึง Token GitLab
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "gitlab" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) {
    return Response.json({ error: "No GitLab token" }, { status: 400 });
  }

  const encodedId = encodeURIComponent(full_name);
  const encodedPath = encodeURIComponent(path); // GitLab ต้อง Encode path เสมอ

  try {
    // 2. Push mode: targetBranch = branch; create branch if it doesn't exist
    let targetBranch = branch;
    if (mode === "push") {
      const branchCheckRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/branches/${encodeURIComponent(branch)}`,
        { method: "HEAD", headers: { Authorization: `Bearer ${account.accessToken}` } },
      );
      if (!branchCheckRes.ok) {
        // branch doesn't exist -> create from baseBranch
        const createBranchRes = await fetch(
          `https://gitlab.com/api/v4/projects/${encodedId}/repository/branches`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ branch, ref: baseBranch }),
          },
        );
        if (!createBranchRes.ok) {
          const errText = await createBranchRes.text();
          let msg = "Failed to create new branch.";
          try {
            const err = JSON.parse(errText);
            if (err.message?.includes("already exists") || err.error?.includes("exists")) {
              msg = "Branch already exists. Choose another name.";
            } else {
              msg = err.message || err.error || msg;
            }
          } catch {
            if (errText.includes("already exists")) msg = "Branch already exists. Choose another name.";
          }
          throw new Error(msg);
        }
      }
    }

    // 3. Check if file exists (for action: create vs update). Push: check target branch; PR: check base.
    let action = "create";
    const refForFileCheck = mode === "push" ? targetBranch : baseBranch;
    const checkRes = await fetch(
      `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}?ref=${refForFileCheck}`,
      {
        method: "HEAD",
        headers: { Authorization: `Bearer ${account.accessToken}` },
      },
    );
    if (checkRes.ok) action = "update";

    // 4. Pull Request mode: create temp branch then MR
    if (mode === "pull_request") {
      // ✅ สร้างวันที่แบบอ่านง่าย (YYYYMMDD-HHmm)
      const now = new Date();
      const dateStr = now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "-")
        .slice(0, 13); // ได้ค่าเช่น 20260204-1959

      // ผลลัพธ์: "pg-20260204-1959"
      targetBranch = `pg-${dateStr}`;

      // สร้าง Branch ใหม่จาก baseBranch
      const createBranchRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/branches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branch: targetBranch,
            ref: baseBranch,
          }),
        },
      );

      if (!createBranchRes.ok) throw new Error("Failed to create new branch");
    }

    // 4. ยิง Commit
    const commitPayload = {
      branch: targetBranch,
      commit_message: message || title || "Update pipeline via PipeGen",
      actions: [
        {
          action: action, // "create" | "update"
          file_path: path,
          content: content,
        },
      ],
    };

    const commitRes = await fetch(
      `https://gitlab.com/api/v4/projects/${encodedId}/repository/commits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commitPayload),
      },
    );

    if (!commitRes.ok) {
      const errorText = await commitRes.text(); // อ่านเป็น Text ดิบๆ ก่อน
      console.error("❌ GitLab Raw Error:", errorText); // ปริ้นท์ออกมาดูเลย
      console.error(
        "❌ Payload ที่ส่งไป:",
        JSON.stringify(commitPayload, null, 2),
      ); // ปริ้นท์ของที่เราส่งไปดูด้วย

      try {
        const err = JSON.parse(errorText);
        // GitLab ชอบส่ง error มาหลายท่า เช่น message, error, หรือ base array
        const msg = err.message || err.error || JSON.stringify(err);
        throw new Error(msg);
      } catch (e) {
        throw new Error("GitLab Error: " + errorText);
      }
    }

    const commitData = await commitRes.json();

    // 5. ถ้าเป็น Pull Request -> ให้สร้าง Merge Request ต่อทันที
    let html_url = commitData.web_url; // Default คือลิงก์ไปหา Commit

    if (mode === "pull_request") {
      const mrRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/merge_requests`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_branch: targetBranch,
            target_branch: baseBranch,
            title: title || "Update Pipeline",
            description: message || "Generated by PipeGen",
          }),
        },
      );

      if (mrRes.ok) {
        const mrData = await mrRes.json();
        html_url = mrData.web_url; // เปลี่ยนลิงก์ให้พาไปหน้า Merge Request
      }
    }

    return Response.json({ ok: true, html_url });
  } catch (error: any) {
    console.error("GitLab Commit Error:", error);
    return Response.json(
      { error: error.message || "Commit failed" },
      { status: 500 },
    );
  }
}
