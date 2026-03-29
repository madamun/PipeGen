// app/api/ai/chat/route.ts — POST: chat with AI (Gemini); context = current file + pipeline config

import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "../../../../packages/server/session";
import { prisma } from "../../../../packages/server/prisma";

const GEMINI_MODEL = "gemini-2.5-flash";

// ไฟล์ที่จะ fetch จาก repo เพื่อให้ AI เข้าใจ context
const REPO_FILES_TO_FETCH = [
  "package.json",
  "Dockerfile",
  "docker-compose.yml",
  "tsconfig.json",
  ".env.example",
  "README.md",
  "prisma/schema.prisma",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
];

// หา sub-project package.json จาก Git Tree API
async function findSubProjectFiles(
  repoFullName: string,
  branch: string,
  provider: string,
  accessToken: string,
): Promise<string[]> {
  try {
    let treeFiles: { path: string }[] = [];
    if (provider === "github") {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (res.ok) {
        const data = await res.json();
        treeFiles = data.tree || [];
      }
    } else {
      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/repository/tree?ref=${branch}&recursive=true&per_page=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) treeFiles = await res.json();
    }

    // หา package.json ที่ไม่ใช่ root และไม่อยู่ใน node_modules
    return treeFiles
      .filter((f: any) => {
        const p = f.path;
        return p.endsWith("/package.json") &&
          !p.includes("node_modules") &&
          p.split("/").length <= 3; // จำกัด depth 3 ชั้น
      })
      .map((f: any) => f.path)
      .slice(0, 5); // จำกัด 5 sub-projects
  } catch {
    return [];
  }
}

async function fetchRepoFiles(
  repoFullName: string,
  branch: string,
  repoProvider: string,
  accessToken: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  const fetches = REPO_FILES_TO_FETCH.map(async (filename) => {
    try {
      let url: string;
      const headers: Record<string, string> =
        repoProvider === "github"
          ? { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3.raw" }
          : { Authorization: `Bearer ${accessToken}` };

      if (repoProvider === "github") {
        url = `https://api.github.com/repos/${repoFullName}/contents/${filename}?ref=${branch}`;
      } else {
        url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/repository/files/${encodeURIComponent(filename)}/raw?ref=${branch}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        let content = await res.text();
        // จำกัดขนาด (README อาจยาวมาก)
        if (content.length > 2000) content = content.slice(0, 2000) + "\n... (truncated)";
        files[filename] = content;
      }
    } catch { /* skip */ }
  });

  await Promise.all(fetches);
  return files;
}
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context?: {
    fileContent: string;
    selectedFile: string;
    componentValues?: Record<string, unknown>;
    provider?: string;
    repoFullName?: string;
    branch?: string;
    repoProvider?: string;
    pipelineFiles?: string[];
  };
}

function buildSystemPrompt(context: RequestBody["context"], repoFiles?: Record<string, string>): string {
  const parts = [
    `You are the AI assistant for PipeGen — a visual CI/CD pipeline builder.
Your job is to help users edit their pipeline YAML. You have access to their current file and UI settings.

CRITICAL RULES:
1. When the user asks to ADD a step/job, output a brief explanation (2-3 sentences) followed by the YAML snippet in a code block. Never output the entire file.
2. Match the indentation of the existing file exactly. For GitHub Actions steps, use the same indent as other "- name:" lines in the file.
3. Use these exact templates from our system (do NOT invent your own):

GitHub Actions steps:
- Deploy to Vercel:
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}

- Slack Notification:
      - name: Notify Slack
        if: always()
        run: |
          curl -X POST -H 'Content-type: application/json' --data '{"text":"\${{ github.repository }} pipeline #\${{ github.run_number }} on \${{ github.ref_name }} - completed"}' \${{ secrets.SLACK_WEBHOOK_URL }}

- Upload Coverage (Codecov):
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}

- Docker Build & Push:
      - name: Build Docker Image
        run: docker build -t username/repo:latest .
      - name: Push to Docker Hub
        run: |
          echo "\${{ secrets.DOCKER_PASSWORD }}" | docker login -u "\${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push username/repo:latest

GitLab CI jobs:
- Deploy to Vercel:
deploy_vercel:
  stage: deploy
  image: node:20
  before_script: []
  script:
    - npm i -g vercel
    - vercel pull --yes --environment=production --token=$VERCEL_TOKEN
    - vercel build --prod --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN

4. For GitHub Actions: steps are indented 6 spaces (under "steps:"). Each line inside a step is indented 8 spaces.
5. For GitLab CI: jobs are top-level keys. Scripts are indented 4 spaces.
เปลี่ยนเป็น:
6. When the user says "explain", explain clearly in short paragraphs.
7. When the user says "optimize", suggest specific improvements.
8. When creating a FULL pipeline from scratch, use this exact structure for GitHub Actions:

name: Auto-Generated-Pipeline

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:

      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          if ! command -v npm > /dev/null 2>&1; then npm install -g npm; fi
          npm ci

      - name: Run Tests
        run: npm test

      - name: Build Project
        run: npm run build

Add or remove steps as the user requests, but ALWAYS keep this exact format:
- Job name must be "build-and-deploy"
- Step names must match exactly: "Checkout Code", "Setup Node.js", "Install Dependencies", "Run Tests", "Build Project"
- Install step must include the npm check command
- Use 2-space indentation throughout

9. For GitLab CI full pipeline:

stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: node:20
  before_script:
    - npm ci
  script:
    - npm run build

test:
  stage: test
  image: node:20
  before_script:
    - npm ci
  script:
    - npm test

Keep GitLab job names lowercase and matching our system.`,
  ];
  if (context) {
    if (context.provider) {
      parts.push(`Target CI platform: ${context.provider === "gitlab" ? "GitLab CI" : "GitHub Actions"}`);
    }
    if (context.selectedFile) {
      parts.push(`Current file: ${context.selectedFile}`);
    }
    if (context.fileContent) {
      parts.push("Current file content (YAML):\n```yaml\n" + context.fileContent + "\n```");
    }
    if (context.componentValues && Object.keys(context.componentValues).length > 0) {
      parts.push(
        "Pipeline UI state (what the user has set in the app):\n" +
        JSON.stringify(context.componentValues, null, 2)
      );
    }
  }
    if (repoFiles && Object.keys(repoFiles).length > 0) {
    parts.push("=== Repository Files (read-only context) ===");
    for (const [filename, content] of Object.entries(repoFiles)) {
      parts.push(`--- ${filename} ---\n${content}`);
    }
    parts.push("Use these files to understand the project structure, dependencies, and configuration. You can reference them when answering questions about the project.");
  }

  return parts.join("\n\n");
}


export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env or .env.local." },
      { status: 501 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Body must include messages (array of { role, content })" },
      { status: 400 }
    );
  }

  // Fetch repo files ถ้ามี repo info
  let repoFiles: Record<string, string> = {};
  if (context?.repoFullName && context?.branch) {
    try {
     const session = await getServerSession(request);
      if (session?.user?.id) {
        const rp = context.repoProvider || "github";
        const account = await prisma.account.findFirst({
          where: { userId: session.user.id, providerId: rp },
          select: { accessToken: true },
        });
        const token = account?.accessToken;
        if (token) {
          repoFiles = await fetchRepoFiles(
            context.repoFullName,
            context.branch,
            rp,
            token,
          );

                      // fetch sub-project package.json (monorepo)
          const subProjectFiles = await findSubProjectFiles(
            context.repoFullName,
            context.branch,
            rp,
            token,
          );
          for (const spFile of subProjectFiles) {
            if (repoFiles[spFile]) continue; // ข้ามถ้า fetch แล้ว
            try {
              let url: string;
              const h: Record<string, string> =
                rp === "github"
                  ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" }
                  : { Authorization: `Bearer ${token}` };
              if (rp === "github") {
                url = `https://api.github.com/repos/${context.repoFullName}/contents/${spFile}?ref=${context.branch}`;
              } else {
                url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(context.repoFullName!)}/repository/files/${encodeURIComponent(spFile)}/raw?ref=${context.branch}`;
              }
              const res = await fetch(url, { headers: h });
              if (res.ok) {
                const content = await res.text();
                repoFiles[`[sub-project] ${spFile}`] = content.length > 2000 ? content.slice(0, 2000) + "\n... (truncated)" : content;
              }
            } catch { /* skip */ }
          }

          // fetch pipeline files ทั้งหมดที่มีใน repo
          if (context.pipelineFiles && context.pipelineFiles.length > 0) {
            const pipelineFetches = context.pipelineFiles
              .filter(f => f !== context.selectedFile) // ไม่ fetch ไฟล์ที่เปิดอยู่ (มีใน fileContent แล้ว)
              .map(async (filePath) => {
                try {
                  let url: string;
                  const rp = context.repoProvider || "github";
                  const headers: Record<string, string> =
                    rp === "github"
                      ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" }
                      : { Authorization: `Bearer ${token}` };

                  if (rp === "github") {
                    url = `https://api.github.com/repos/${context.repoFullName}/contents/${filePath}?ref=${context.branch}`;
                  } else {
                    url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(context.repoFullName!)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${context.branch}`;
                  }

                  const res = await fetch(url, { headers });
                  if (res.ok) {
                    const content = await res.text();
                    repoFiles[`[pipeline] ${filePath}`] = content.length > 3000 ? content.slice(0, 3000) + "\n... (truncated)" : content;
                  }
                } catch { /* skip */ }
              });

            await Promise.all(pipelineFetches);
          }
        }
      }
    } catch (e) {
      console.error("[ai/chat] Failed to fetch repo files:", e);
    }
  }

  const systemPrompt = buildSystemPrompt(context, repoFiles);
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.2,
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || res.statusText || "Gemini request failed" },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const content = typeof text === "string" ? text.trim() : "";
    return NextResponse.json({ content });
  } catch (e) {
    console.error("[ai/chat]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
