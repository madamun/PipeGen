import { NextRequest } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) {
    return Response.json({ error: "No GitHub access token" }, { status: 400 });
  }

  const ghHeaders = {
    Authorization: `Bearer ${account.accessToken}`,
    "User-Agent": "pipe-gen-app",
    Accept: "application/vnd.github+json",
  };

  // 1. ดึงข้อมูล User Profile
  const meRes = await fetch("https://api.github.com/user", {
    headers: ghHeaders,
    cache: "no-store",
  });

  if (!meRes.ok) {
    const t = await meRes.text();
    return Response.json(
      { error: `GitHub /user ${meRes.status}`, detail: t.slice(0, 200) },
      { status: 502 },
    );
  }
  const me = await meRes.json();

  // 2. ถามหาว่าลง GitHub App ไว้ที่ไหนบ้าง (Installations)
  let rawRepos: any[] = [];
  const instRes = await fetch("https://api.github.com/user/installations", {
    headers: ghHeaders,
    cache: "no-store",
  });

  if (!instRes.ok) {
    const t = await instRes.text();
    return Response.json(
      { error: `GitHub /user/installations ${instRes.status}`, detail: t.slice(0, 200) },
      { status: 502 },
    );
  }

  const instData = await instRes.json();

  // 3. ดึง Repositories จากทุก Installation ที่ได้รับสิทธิ์ (กรณี User ลงแอปไว้หลายองค์กร)
  if (instData.installations && instData.installations.length > 0) {
    const repoPromises = instData.installations.map(async (inst: any) => {
      const repoRes = await fetch(
        `https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`,
        { headers: ghHeaders, cache: "no-store" }
      );
      if (repoRes.ok) {
        const data = await repoRes.json();
        // GitHub App จะคืนค่า Repo กลับมาในคีย์ชื่อ repositories
        return data.repositories || [];
      }
      return [];
    });

    const reposArrays = await Promise.all(repoPromises);
    rawRepos = reposArrays.flat(); // จับรวมกันเป็น Array ก้อนเดียว
  }

  // 4. แปลงข้อมูลกลับไปใช้ Format เดิมเพื่อไม่ให้ UI พัง
  const baseRepos = rawRepos.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    visibility: r.visibility,
    default_branch: r.default_branch,
    language: r.language,
    topics: r.topics,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    owner: { login: r.owner?.login, avatar_url: r.owner?.avatar_url },
    permissions: r.permissions,
    updated_at: r.updated_at,
    provider: "github",
  }));

  // ระวัง rate limit — enrich แค่ชุดแรกก่อน (ปรับได้)
  const MAX_META = 24;
  const head = baseRepos.slice(0, MAX_META);
  const tail = baseRepos.slice(MAX_META);

  const withMeta = await Promise.all(
    head.map(async (r) => {
      const full = encodeURIComponent(r.full_name);
      const [branchesRes, tagsRes, workflowsRes, langsRes] = await Promise.all([
        fetch(
          `https://api.github.com/repos/${r.full_name}/branches?per_page=1`,
          { headers: ghHeaders, cache: "no-store" },
        ),
        fetch(`https://api.github.com/repos/${r.full_name}/tags?per_page=1`, {
          headers: ghHeaders,
          cache: "no-store",
        }),
        fetch(`https://api.github.com/repos/${r.full_name}/actions/workflows`, {
          headers: ghHeaders,
          cache: "no-store",
        }),
        fetch(`https://api.github.com/repos/${r.full_name}/languages`, {
          headers: ghHeaders,
          cache: "no-store",
        }),
      ]);

      const branchCount = await countFromLinkOrBody(branchesRes);
      const tagCount = await countFromLinkOrBody(tagsRes);

      let pipelineCount = 0;
      if (workflowsRes.ok) {
        const w = await safeJson(workflowsRes);
        pipelineCount = w?.total_count ?? 0;
      }

      let languages: string[] = [];
      if (langsRes.ok) {
        const l = (await safeJson(langsRes)) as Record<string, number>;
        if (l) {
          languages = Object.keys(l)
            .sort((a, b) => (l[b] ?? 0) - (l[a] ?? 0))
            .slice(0, 8);
        }
      }

      return {
        ...r,
        _meta: { branchCount, tagCount, pipelineCount, languages } as const,
      };
    }),
  );

  const others = tail.map((r) => ({ ...r, _meta: null as any }));

  return Response.json({
    me: { login: me.login, avatar_url: me.avatar_url },
    repos: [...withMeta, ...others],
  });
}

async function countFromLinkOrBody(res: Response) {
  if (!res.ok) return 0;
  const link = res.headers.get("link");
  if (link && link.includes('rel="last"')) {
    const m = link.match(/[\?&]page=(\d+)>; rel="last"/);
    if (m) return Number(m[1]);
  }
  try {
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}