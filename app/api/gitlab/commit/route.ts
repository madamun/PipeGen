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

  const userId = session.user.id;

  const body = (await req.json()) as Body;
  const { full_name, baseBranch, branch: targetBranch, mode, title, message, path, content } = body;

  if (!full_name || !baseBranch || !path || !content) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  let branch = (targetBranch || baseBranch).trim();
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
    where: { userId: userId, providerId: "gitlab" },
    select: { accessToken: true },
  });

  if (!account?.accessToken) {
    return Response.json({ error: "No GitLab token" }, { status: 400 });
  }

  const encodedId = encodeURIComponent(full_name);
  const encodedPath = encodeURIComponent(path); 

  try {
    let finalTargetBranch = branch;
    
    // 2. Push mode: สร้าง Branch ใหม่ถ้ายังไม่มี
    if (mode === "push") {
      const branchCheckRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/branches/${encodeURIComponent(branch)}`,
        { method: "HEAD", headers: { Authorization: `Bearer ${account.accessToken}` } },
      );
      if (!branchCheckRes.ok) {
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

    // 3. Check if file exists (for action: create vs update)
    let action = "create";
    const refForFileCheck = mode === "push" ? finalTargetBranch : baseBranch;
    const checkRes = await fetch(
      `https://gitlab.com/api/v4/projects/${encodedId}/repository/files/${encodedPath}?ref=${refForFileCheck}`,
      {
        method: "HEAD",
        headers: { Authorization: `Bearer ${account.accessToken}` },
      },
    );
    if (checkRes.ok) action = "update";

    // 4. Pull Request mode: create temp branch
    if (mode === "pull_request") {
      const now = new Date();
      const dateStr = now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "-")
        .slice(0, 13); 

      finalTargetBranch = `pg-${dateStr}`;

      const createBranchRes = await fetch(
        `https://gitlab.com/api/v4/projects/${encodedId}/repository/branches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branch: finalTargetBranch,
            ref: baseBranch,
          }),
        },
      );

      if (!createBranchRes.ok) throw new Error("Failed to create temp branch for MR");
    }

    // 5. ยิง Commit
    const commitMessage = message || title || "Update pipeline via PipeGen";
    const commitPayload = {
      branch: finalTargetBranch,
      commit_message: commitMessage,
      actions: [
        {
          action: action, 
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
      const errorText = await commitRes.text(); 
      throw new Error(`GitLab Error: ${errorText}`);
    }

    const commitData = await commitRes.json();
    let html_url = commitData.web_url; 

    // 6. สร้าง Merge Request ถ้าอยู่ในโหมด pull_request
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
            source_branch: finalTargetBranch,
            target_branch: baseBranch,
            title: title || "Update Pipeline",
            description: commitMessage,
          }),
        },
      );

      if (mrRes.ok) {
        const mrData = await mrRes.json();
        html_url = mrData.web_url; 
      }
    }

    // บันทึกประวัติลง Database สำหรับหน้า History
    try {
      await prisma.pipelineHistory.create({
        data: {
          userId: userId,
          provider: "gitlab",
          repoFullName: full_name,
          branch: finalTargetBranch, // บันทึกชื่อ Branch ที่ยิงไป
          filePath: path,
          commitMessage: commitMessage,
          commitUrl: html_url,
          actionType: mode === "pull_request" ? "pull_request" : "push",
          yamlContent: content,
        },
      });
    } catch (dbError) {
      console.error("[GitLab] Failed to save Pipeline History:", dbError);
      
    }
    try {
      await prisma.pipelineDraft.deleteMany({
        where: {
          pipeline: {
            filePath: path,
            repository: {
              fullName: full_name,
            },
          },
        },
      });
    } catch (e) {

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