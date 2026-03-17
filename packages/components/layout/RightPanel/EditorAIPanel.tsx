"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { usePipeline } from "../../workspace/PipelineProvider";

interface EditorAIPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function EditorAIPanel({
  open,
  onOpenChange,
  containerRef,
}: EditorAIPanelProps) {
  const { fileContent, selectedFile, componentValues } = usePipeline();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!open) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            fileContent: fileContent ?? "",
            selectedFile: selectedFile ?? "",
            componentValues: componentValues ?? {},
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
    <div
      className="absolute top-2 left-2 right-2 z-20 flex flex-col rounded-lg border border-white/20 bg-[#0f1e50] shadow-lg overflow-hidden resize-y min-h-[120px] max-h-[50%] w-[calc(100%-16px)]"
    >
      <div className="flex items-center justify-between shrink-0 px-3 py-2 border-b border-white/10 bg-[#02184B]/80">
        <span className="text-xs font-medium text-slate-200">AI Assistant</span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[80px] max-h-[240px]"
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ask about your pipeline YAML or current setup. I have access to the current file and your pipeline settings.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm ${m.role === "user" ? "text-slate-200" : "text-slate-300"}`}
          >
            <span className="font-medium text-slate-400 mr-2">{m.role === "user" ? "You" : "AI"}:</span>
            <span className="whitespace-pre-wrap break-words">{m.content}</span>
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
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
