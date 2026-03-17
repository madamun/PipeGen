import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "../../../../packages/server/auth";
import { prisma } from "../../../../packages/server/prisma";
import { analyzeRepo } from "../../../../packages/server/pipelineAnalyzer";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    repoFullName?: string;
    branch?: string;
    provider?: "github" | "gitlab";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repoFullName, branch, provider } = body;
  if (!repoFullName || !provider) {
    return NextResponse.json(
      { error: "repoFullName and provider required" },
      { status: 400 },
    );
  }

  // ดึง Token ตาม Provider
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: provider },
    select: { accessToken: true },
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: `No ${provider} token` },
      { status: 401 },
    );
  }

  try {
    const config = await analyzeRepo({
      repoFullName,
      branch: branch || "main",
      provider,
      accessToken: account.accessToken,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 },
    );
  }
}