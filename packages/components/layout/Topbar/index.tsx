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
        <div className="flex flex-1 basis-0 justify-end items-center gap-4">
          <TopbarActions />
        </div>
      </div>
    </div>
  );
}
