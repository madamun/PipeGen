"use client";

import { usePipeline } from "@/components/workspace/PipelineProvider";
import { Github, Gitlab } from "lucide-react";

const langs = [
  { id: "git",      label: "Selector 1", icon: <Github className="h-5 w-5" /> },
  { id: "selector2", label: "Selector 2", icon: <Gitlab className="h-5 w-5" /> },
];

export default function LanguageSection() {
  const { language, setLanguage } = usePipeline();

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-white">Language</h3>

      <div
        className="
          inline-flex items-center gap-0 rounded-lg
          bg-[#0D1B3A] p-1
        "
      >
        {langs.map((lang) => {
          const active = (language || "git") === lang.id;
          return (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                transition-colors
                ${active ? "bg-[#6B8CFF] text-white" : "text-slate-200 hover:bg-white/10"}
              `}
            >
              <span className="h-5 w-5 shrink-0">{lang.icon}</span>
              {lang.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
