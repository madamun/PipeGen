"use client";

import ProjectInfo from "./ProjectInfo";
import TopbarActions from "./TopbarActions";

export type AppMode = "pipeline" | "template";

interface TopbarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function Topbar({ mode, onModeChange }: TopbarProps) {
  return (
    <div className="w-full shrink-0 border-b border-white/10 bg-[#02184B]/80">
      <div className="flex h-12 items-center px-6 py-2">
        <div className="flex flex-1 basis-0 items-center gap-2">
          <ProjectInfo />
        </div>
        <div className="flex flex-1 basis-0 justify-center items-center">
          <div className="flex rounded-lg border border-white/20 bg-[#010819] p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => onModeChange("pipeline")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "pipeline"
                  ? "bg-[#3b82f6] text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              สร้าง Pipeline
            </button>
            <button
              type="button"
              onClick={() => onModeChange("template")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "template"
                  ? "bg-[#3b82f6] text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              สร้าง Template
            </button>
          </div>
        </div>
        <div className="flex flex-1 basis-0 justify-end items-center gap-4">
          <TopbarActions />
        </div>
      </div>
    </div>
  );
}
