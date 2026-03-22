"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Copy, Check, ClipboardPaste, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { usePipeline } from "../../workspace/PipelineProvider";

interface EditorAIPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function CodeBlock({ children, onApply }: { children: string; onApply: (code: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2">
      <pre className="bg-black/40 rounded-t-md p-3 overflow-x-auto text-xs">
        <code className="text-blue-300 break-all whitespace-pre-wrap">{children}</code>
      </pre>
      <div className="flex items-center gap-1 bg-black/30 rounded-b-md px-2 py-1.5 border-t border-white/5">
        <button
          type="button"
          onClick={handleCopy}
          className="h-7 px-2 rounded bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => onApply(children)}
          className="h-7 px-2 rounded bg-[#5184FB]/80 text-white hover:bg-[#5184FB] text-[11px] flex items-center gap-1 transition-colors"
          title="Apply to editor"
        >
          <ClipboardPaste className="h-3 w-3" />
          <span>Apply</span>
        </button>
      </div>
    </div>
  );
}

export default function EditorAIPanel({
  open,
  onOpenChange,
}: EditorAIPanelProps) {
  const { fileContent, setFileContent, selectedFile, componentValues, provider, categories, updateComponentValue, applyMultipleValues } = usePipeline();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingConfigRef = useRef<Record<string, any> | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ตรวจว่า prompt เป็นการขอสร้าง pipeline หรือไม่
  const isCreateRequest = useCallback((text: string) => {
    const lower = text.toLowerCase();
    // ต้องมี keyword สร้าง + คำว่า pipeline
    const createKeywords = ["create", "generate", "build me", "make a", "สร้าง", "set up a"];
    const hasCreate = createKeywords.some((k) => lower.includes(k));
    const hasPipeline = lower.includes("pipeline") || lower.includes("ci/cd") || lower.includes("workflow");
    return hasCreate && hasPipeline;
  }, []);

  // ชั้น 1: สร้าง pipeline ผ่าน engine ของเรา (+ fallback ที่ server)
  const handleGenerateViaEngine = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to generate config");
        setLoading(false);
        return;
      }

      // === Fallback: server gen YAML ให้แล้ว (unsupported language) ===
      if (data.fallback === true) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.content || "Failed to generate pipeline.",
        }]);
        setLoading(false);
        return;
      }

      // === Normal: มี config จาก engine ===
      const config = data.config;
      if (!config) {
        setError("Failed to generate config");
        setLoading(false);
        return;
      }

      pendingConfigRef.current = config;

      // สร้าง summary
      const enabled: string[] = [];
      if (config.use_node) enabled.push("Node.js");
      if (config.use_python) enabled.push("Python");
      if (config.use_go) enabled.push("Go");
      if (config.use_rust) enabled.push("Rust");
      if (config.run_tests) enabled.push("Testing");
      if (config.check_quality) enabled.push("Linting");
      if (config.enable_security) enabled.push("Security");
      if (config.enable_coverage) enabled.push("Coverage");
      if (config.docker_build) enabled.push("Docker");
      if (config.deploy_vercel) enabled.push("Vercel Deploy");
      if (config.enable_slack) enabled.push("Slack");
      if (config.run_build) enabled.push("Build");
      if (config.enable_push) enabled.push("Push trigger");
      if (config.enable_pr) enabled.push("PR trigger");

      // Preview YAML โดยใช้ engine ของเราแต่ยังไม่ apply
      const { generateYamlFromValues } = await import("../../../lib/pipelineEngine");
      let previewValues = { ...componentValues, ...config };
      // resolve linkedFields for preview
      Object.entries(config).forEach(([fieldId, val]) => {
        if (val !== undefined && val !== null) {
          const lookupKey = String(val);
          categories.forEach(cat =>
            cat.components.forEach((comp: any) => {
              const field = (comp.uiConfig?.fields || []).find((f: any) => f.id === fieldId);
              if (field?.linkedFields) {
                Object.entries(field.linkedFields).forEach(([targetId, mapping]: [string, any]) => {
                  const newVal = mapping[lookupKey];
                  if (newVal) previewValues[targetId] = newVal;
                });
              }
            })
          );
        }
      });
      const yamlPreview = generateYamlFromValues(categories, previewValues, provider, "");

      const summary = `I've analyzed your request and prepared this pipeline:\n\n**Features:** ${enabled.join(", ") || "Basic setup"}\n\n\`\`\`yaml\n${yamlPreview}\n\`\`\`\n\nClick **Apply** to use this YAML. Generated from PipeGen's built-in templates — correct format and full UI sync guaranteed.`;

      setMessages((prev) => [...prev, { role: "assistant", content: summary }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [fileContent, selectedFile, componentValues, provider, categories, applyMultipleValues]);

  const handleApply = useCallback((code: string) => {
    const trimmed = code.trim();

    // 0. ถ้ามี pending config จาก generate → apply ผ่าน engine
    if (pendingConfigRef.current && /^name:/m.test(trimmed)) {
      applyMultipleValues(pendingConfigRef.current);
      pendingConfigRef.current = null;
      return;
    }

    // 0b. JSON config fallback
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const config = JSON.parse(trimmed);
        if (config && typeof config === "object") {
          applyMultipleValues(config);
          return;
        }
      } catch { /* not JSON, continue */ }
    }

    // 1. YAML สมบูรณ์ → แทนทั้งหมด
    if (/^(name:|on:|stages:|workflow:)/m.test(trimmed)) {
      setFileContent(trimmed);
      return;
    }

    if (!fileContent?.trim()) {
      setFileContent(trimmed);
      return;
    }

    // 2. ตรวจว่าเป็น GitLab CI หรือ GitHub Actions
    const isGitLab = /^stages:/m.test(fileContent) || /^[a-z_]+:\s*\n\s+stage:/m.test(fileContent);

    if (isGitLab) {
      // GitLab: snippet เป็น top-level job → ไม่ต้อง indent เพิ่ม แค่ strip indent แล้วต่อท้าย
      const lines = trimmed.split("\n");
      let minIndent = Infinity;
      for (const line of lines) {
        if (line.trim() === "") continue;
        const indent = line.match(/^(\s*)/)?.[1].length || 0;
        if (indent < minIndent) minIndent = indent;
      }
      const stripped = lines.map((line) => {
        if (line.trim() === "") return "";
        return line.slice(minIndent);
      }).join("\n");
      setFileContent(fileContent.trimEnd() + "\n\n" + stripped);
      return;
    }

    // 3. GitHub Actions: Reformat snippet ด้วย fixed indent rules
    const existingLines = fileContent.split("\n");
    let stepIndent = 6;
    for (let i = existingLines.length - 1; i >= 0; i--) {
      const m = existingLines[i].match(/^(\s*)- name:/);
      if (m) { stepIndent = m[1].length; break; }
    }

    const lines = trimmed.split("\n");
    const formatted: string[] = [];

    let inRunBlock = false;
    for (const line of lines) {
      const t = line.trim();
      if (t === "") { formatted.push(""); continue; }

      if (t.startsWith("- name:")) {
        inRunBlock = false;
        formatted.push(" ".repeat(stepIndent) + t);
      } else if (t.startsWith("uses:") || t.startsWith("if:") || t.startsWith("with:") || t.startsWith("env:")) {
        inRunBlock = false;
        formatted.push(" ".repeat(stepIndent + 2) + t);
      } else if (t.startsWith("run:")) {
        inRunBlock = t.includes("|");
        formatted.push(" ".repeat(stepIndent + 2) + t);
      } else if (inRunBlock) {
        formatted.push(" ".repeat(stepIndent + 4) + t);
      } else {
        formatted.push(" ".repeat(stepIndent + 4) + t);
      }
    }

    setFileContent(fileContent.trimEnd() + "\n\n" + formatted.join("\n"));
  }, [fileContent, setFileContent, applyMultipleValues]);

  if (!open) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    // ชั้น 1: ถ้าเป็นคำสั่งสร้าง pipeline → ใช้ engine
    if (isCreateRequest(text)) {
      handleGenerateViaEngine(text);
      return;
    }

    // ชั้น 2: อย่างอื่น → ใช้ AI chat ปกติ
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: (() => {
            const filtered = [...messages, userMessage]
              .filter((m) => m.content.length < 2000);
            return filtered.length > 0 ? filtered.map((m) => ({ role: m.role, content: m.content }))
              : [{ role: userMessage.role, content: userMessage.content }];
          })(),
          context: {
            fileContent: fileContent ?? "",
            selectedFile: selectedFile ?? "",
            componentValues: componentValues ?? {},
            provider: provider ?? "github",
          },
        }),
      });
      const data = (await res.json()) as { content?: string; error?: string };

      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        setLoading(false);
        return;
      }

      const content = data?.content?.trim() ?? "";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-white/10 bg-[#0f1e50]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-3 py-3 border-b border-white/10 bg-[#02184B]/80">
        <span className="text-xs font-medium text-slate-200">AI Assistant</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => { setMessages([]); setError(null); pendingConfigRef.current = null; }}
              aria-label="Clear chat"
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10 transition"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-slate-500">
              {fileContent?.trim()
                ? "Ask about your pipeline YAML or current setup."
                : "Start building — describe what pipeline you need."}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {(fileContent?.trim()
                ? [
                  "Explain this YAML",
                  "Optimize my pipeline",
                  "Add a deploy step",
                  "Add caching",
                  "Add security scanning",
                  "Convert to GitLab CI",
                  "What's missing?",
                ]
                : [
                  "Create a Node.js pipeline with testing",
                  "Create a Python CI/CD pipeline",
                  "Create a full pipeline with Docker and Vercel",
                  "Create a pipeline with security scanning",
                ]
              ).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${m.role === "user" ? "text-slate-200" : "text-slate-300"}`}
          >
            <span className="font-medium text-slate-400 mr-2 text-xs">
              {m.role === "user" ? "You" : "AI"}
            </span>
            {m.role === "user" ? (
              <span className="whitespace-pre-wrap break-words">{m.content}</span>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = className?.includes("language-");
                      const code = String(children).replace(/\n$/, "");
                      if (isBlock) {
                        return <CodeBlock onApply={handleApply}>{code}</CodeBlock>;
                      }
                      return (
                        <code className="text-blue-300 text-xs bg-black/30 px-1 py-0.5 rounded" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre({ children }) {
                      return <>{children}</>;
                    },
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your pipeline..."
          className="flex-1 min-w-0 rounded-md border border-white/20 bg-[#010819] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 h-9 px-3 rounded-md bg-[#3b82f6] text-white text-sm font-medium hover:bg-[#2f6ad6] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}