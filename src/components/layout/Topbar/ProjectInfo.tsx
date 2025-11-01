// src/components/layout/Topbar/ProjectInfo.tsx
"use client";

import RepoPicker from "@/components/repo/RepoPicker";
import BranchPicker from "@/components/repo/BranchPicker";
import { usePipeline } from "@/components/workspace/PipelineProvider";

//แสดงชื่อโปรเจ็กต์ + ปุ่มเลือก + ตัวเลือกBranch
export default function ProjectInfo() {
  const { selectedRepo } = usePipeline();
  return (
    <div className="flex flex-col gap-1">
      {/* ชื่อโปรเจ็กต์ */}
      <div className="flex items-center gap-2">
        <span
          className="min-w-0 truncate text-lg font-semibold text-white border-b border-white/40"
          title={selectedRepo?.full_name ?? "Select a repository"}
        >
          {selectedRepo?.name ?? "Select a repository"}
        </span>
        {/* ปุ่มเปิด Dialog เลือก repo */}
        <RepoPicker />
      </div>
      {/* เลือกBranch */}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-slate-300 text-sm">Branch:</span>
        {selectedRepo ? (
          <BranchPicker />
        ) : (
          <span className="text-slate-400 text-sm italic">—</span>
        )}
      </div>
    </div>
  );
}
