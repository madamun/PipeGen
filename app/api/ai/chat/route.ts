// app/api/ai/chat/route.ts — POST: chat with AI (Gemini); context = current file + pipeline config

import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3-flash-preview";
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
  };
}

function buildSystemPrompt(context: RequestBody["context"]): string {
  const parts = [
    "You are a helpful assistant for editing CI/CD pipeline YAML (GitHub Actions or GitLab CI).",
    "Answer briefly and in a practical way. When suggesting YAML changes, output valid YAML snippets when relevant.",
  ];
  if (context) {
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
        generationConfig: { maxOutputTokens: 1024 },
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
