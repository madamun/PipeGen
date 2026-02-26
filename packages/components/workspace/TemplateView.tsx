"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { usePipeline } from "../workspace/PipelineProvider";
import TemplateSectionAccordion from "../template/TemplateSectionAccordion";
import type { TemplateDraft, UserSection } from "../../types/template";

function createId() {
  return crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const initialDraft: TemplateDraft = {
  name: "",
  sections: [],
};

export default function TemplateView() {
  const { categories } = usePipeline();
  const [draft, setDraft] = useState<TemplateDraft>(initialDraft);

  const flatComponents = categories.flatMap((cat) => cat.components);

  const sortedSections = [...draft.sections].sort((a, b) => a.order - b.order);

  const addSection = useCallback(() => {
    const newSection: UserSection = {
      id: createId(),
      name: "หมวดใหม่",
      order: draft.sections.length,
      items: [],
    };
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  }, [draft.sections.length]);

  const updateSection = useCallback((updated: UserSection) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === updated.id ? updated : s)),
    }));
  }, []);

  const deleteSection = useCallback((id: string) => {
    setDraft((prev) => {
      const next = prev.sections.filter((s) => s.id !== id);
      return { ...prev, sections: next.map((s, i) => ({ ...s, order: i })) };
    });
  }, []);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    setDraft((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= sorted.length) return prev;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return {
        ...prev,
        sections: sorted.map((s, idx) => ({ ...s, order: idx })),
      };
    });
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#02184B] overflow-hidden">
      <header className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          placeholder="ชื่อ template (optional)"
          className="rounded-lg border border-white/20 bg-[#010819] px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 w-64 focus:outline-none focus:ring-2 focus:ring-[#5184FB]/50 focus:border-transparent"
        />
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {sortedSections.map((section, index) => (
            <TemplateSectionAccordion
              key={section.id}
              section={section}
              components={flatComponents}
              onUpdateSection={updateSection}
              onDeleteSection={() => deleteSection(section.id)}
              onMoveSectionUp={() => moveSection(section.id, "up")}
              onMoveSectionDown={() => moveSection(section.id, "down")}
              canMoveSectionUp={index > 0}
              canMoveSectionDown={index < sortedSections.length - 1}
              createId={createId}
            />
          ))}
          <button
            type="button"
            onClick={addSection}
            className="flex items-center gap-2 w-full rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-400 hover:border-[#5184FB]/50 hover:bg-white/10 hover:text-slate-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            เพิ่มหมวด
          </button>
        </div>
      </div>
    </div>
  );
}
