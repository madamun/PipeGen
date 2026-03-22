// app/api/ai/chat/route.ts — POST: chat with AI (Gemini); context = current file + pipeline config

import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";
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
  };
}

function buildSystemPrompt(context: RequestBody["context"]): string {
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

  const systemPrompt = buildSystemPrompt(context);
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
