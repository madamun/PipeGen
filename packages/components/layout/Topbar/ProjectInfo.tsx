// src/components/layout/Topbar/ProjectInfo.tsx
"use client";

import RepoPicker from "../../repo/RepoPicker";
import BranchPicker from "../../repo/BranchPicker";
import { usePipeline } from "../../workspace/PipelineProvider";
import { ChevronDown } from "lucide-react";

// Repo + Branch ในหนึ่งแถว (Context bar)
export default function ProjectInfo() {
  const { selectedRepo } = usePipeline();
  return (
    <div className="flex flex-row items-center gap-3">
      <RepoPicker>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-1 py-1 -ml-1 text-left hover:bg-white/10 transition-colors group max-w-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#02184B]"
          title={selectedRepo?.full_name ?? "Click to select a repository"}
          aria-label="Select repository"
        >
          <span className="min-w-0 px-2 truncate text-base font-semibold text-white group-hover:text-white">
            {selectedRepo?.name ?? "Select a repository"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-white mt-1" />
        </button>
      </RepoPicker>
      <span className="text-white/30">|</span>
      <span className="text-slate-400 text-sm shrink-0">Branch:</span>
      {selectedRepo ? (
        <BranchPicker />
      ) : (
        <span className="text-slate-500 text-sm italic" title="Select a repository first">
          Select a repository first
        </span>
      )}
    </div>
  );
}
