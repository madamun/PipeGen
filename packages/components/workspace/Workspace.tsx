"use client";

import React, { useState, useCallback, useRef } from "react";
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

export default function Workspace({ mode, onToggleAI, aiPanelOpen }: { mode: AppMode; onToggleAI?: () => void; aiPanelOpen?: boolean }) {
  const { isCollapsed } = usePipeline();
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyDraft);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(580);

  // เปิด AI → หด Left เป็น 360, ปิด AI → กลับ 580
  React.useEffect(() => {
    if (aiPanelOpen) {
      setLeftWidth((prev) => Math.min(prev, 360));
    } else {
      setLeftWidth(580);
    }
  }, [aiPanelOpen]);

  const isResizingLeft = useRef(false);

  const gridClass = `grid gap-6 min-h-[calc(100dvh-128px)] h-[calc(100dvh-128px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
    isCollapsed ? "grid-cols-[80px_1fr]" : "grid-cols-1 lg:grid-cols-[580px_1fr]"
  }`;

  const handleLeftResize = useCallback(() => {
    if (isCollapsed) return;
    isResizingLeft.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeft.current) return;
      setLeftWidth(Math.max(360, Math.min(580, e.clientX)));
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [isCollapsed]);

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
    <div className="flex min-h-[calc(100dvh-128px)] h-[calc(100dvh-128px)] overflow-hidden">
      <div
        style={{ width: isCollapsed ? 80 : leftWidth }}
        className="min-h-0 h-full overflow-hidden shrink-0"
      >
        <LeftPanel />
      </div>
      {!isCollapsed && (
        <div
          onMouseDown={handleLeftResize}
          className="w-0.5 shrink-0 cursor-col-resize transition-all flex items-center"
        >
          <div className="h-28/30 w-full bg-white/3 rounded-full hover:bg-[#5184FB]/50 active:bg-[#5184FB]/50" />
        </div>
      
      )}
      <div className="min-h-0 h-full overflow-hidden flex-1">
        <RightPanel onOpenAIPanel={onToggleAI} />
      </div>
    </div>
  );
}