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

  try {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: provider },
    });
    if (!account?.accessToken) {
      return NextResponse.json({ error: "Token not found" }, { status: 401 });
    }

    const config = await analyzeRepo({
      repoFullName,
      branch: branch ?? "main",
      provider,
      accessToken: account.accessToken,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Pipeline analyze error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
