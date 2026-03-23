"use client";

import React, { useState, useCallback, useRef } from "react";
import Topbar from "../layout/Topbar";
import Workspace from "./Workspace";
import EditorAIPanel from "../layout/RightPanel/EditorAIPanel";
import type { AppMode } from "../layout/Topbar";

export default function AppShell() {
  const [mode, setMode] = useState<AppMode>("pipeline");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiWidth, setAiWidth] = useState(340);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setAiWidth(Math.max(280, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <main className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        <Topbar mode={mode} onModeChange={setMode} />
        <Workspace mode={mode} onToggleAI={() => setAiPanelOpen(!aiPanelOpen)} aiPanelOpen={aiPanelOpen} />
      </div>
      {aiPanelOpen && (
        <>
          <div
            onMouseDown={handleMouseDown}
            className="w-0.5 shrink-0 cursor-col-resize bg-white/3 hover:bg-[#5184FB]/50 active:bg-[#5184FB]/50 transition-colors"
          />
          <div style={{ width: aiWidth }} className="shrink-0 h-full">
            <EditorAIPanel open={aiPanelOpen} onOpenChange={setAiPanelOpen} />
          </div>
        </>
      )}
    </main>
  );
}