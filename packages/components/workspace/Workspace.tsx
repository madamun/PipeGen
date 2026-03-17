"use client";

import React, { useState, useCallback } from "react";
import LeftPanel from "../layout/LeftPanel/LeftPanel";
import RightPanel from "../layout/RightPanel/RightPanel";
import TemplateLeftPanel from "../template/TemplateLeftPanel";
import TemplateRightPanel from "../template/TemplateRightPanel";
import { usePipeline } from "../workspace/PipelineProvider";
import type { AppMode } from "../layout/Topbar";
import type { TemplateDraft, UserSection } from "../../types/template";

const emptyDraft: TemplateDraft = { name: "", sections: [] };

function createId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Workspace({ mode }: { mode: AppMode }) {
  const { isCollapsed } = usePipeline();
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyDraft);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const gridClass = `grid gap-6 min-h-[calc(100dvh-128px)] h-[calc(100dvh-128px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
    isCollapsed ? "grid-cols-[80px_1fr]" : "grid-cols-1 lg:grid-cols-[580px_1fr]"
  }`;

  const updateSection = useCallback((section: UserSection) => {
    setTemplateDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === section.id ? section : s)),
    }));
  }, []);

  const deleteSection = useCallback((id: string) => {
    setTemplateDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
    setSelectedSectionId((prev) => (prev === id ? null : prev));
  }, []);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    setTemplateDraft((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const j = direction === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= sorted.length) return prev;
      [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
      return {
        ...prev,
        sections: sorted.map((s, i) => ({ ...s, order: i })),
      };
    });
  }, []);

  const addSection = useCallback(() => {
    const id = createId();
    const newSection: UserSection = {
      id,
      name: "หมวดใหม่",
      order: templateDraft.sections.length,
      items: [],
    };
    setTemplateDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setSelectedSectionId(id);
  }, [templateDraft.sections.length]);

  if (mode === "template") {
    const selectedSection =
      templateDraft.sections.find((s) => s.id === selectedSectionId) ?? null;
    return (
      <div className={gridClass}>
        <div className="min-h-0 h-full overflow-hidden">
          <TemplateLeftPanel
            sections={templateDraft.sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onUpdateSection={updateSection}
            onDeleteSection={deleteSection}
            onMoveSection={moveSection}
            onAddSection={addSection}
          />
        </div>
        <div className="min-h-0 h-full overflow-hidden">
          <TemplateRightPanel
            templateName={templateDraft.name ?? ""}
            onTemplateNameChange={(name) =>
              setTemplateDraft((prev) => ({ ...prev, name }))
            }
            selectedSection={selectedSection}
            onUpdateSection={updateSection}
            createId={createId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      <div className="min-h-0 h-full overflow-hidden">
        <LeftPanel />
      </div>
      <div className="min-h-0 h-full overflow-hidden">
        <RightPanel />
      </div>
    </div>
  );
}
