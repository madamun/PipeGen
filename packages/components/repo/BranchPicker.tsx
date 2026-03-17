// src/components/repo/BranchPicker.tsx

"use client";

import * as React from "react";
import { usePipeline } from "../workspace/PipelineProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { AlertCircle } from "lucide-react";

export default function BranchPicker() {
  // 1. Logic ใหม่: ดึงของจาก Provider
  const {
    provider,
    selectedRepo,
    selectedBranch,
    setSelectedBranch,
    availableBranches,
    fetchBranches,
    isLoading,
  } = usePipeline();

  // 2. Logic ใหม่: เมื่อ Repo เปลี่ยน ให้สั่ง Provider ไปดึง Branch
  React.useEffect(() => {
    if (selectedRepo?.full_name) {
      fetchBranches(selectedRepo.full_name);
    }
  }, [selectedRepo?.full_name, fetchBranches]);

  // Sync เรียกจาก PipelineProvider.refreshFileList เท่านั้น (เลี่ยงการเรียกซ้ำ → 400)

  // ถ้ายังไม่เลือก Repo
  if (!selectedRepo)
    return <span className="text-slate-400 text-sm italic">—</span>;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedBranch || ""}
        onValueChange={(v) => setSelectedBranch(v)}
        disabled={isLoading || availableBranches.length === 0}
      >
        <SelectTrigger aria-label="Choose branch" className="h-8 min-w-44 w-44 text-white bg-[#0f1e50] border border-white/20 text-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <SelectValue
              placeholder={
                isLoading
                  ? "Loading..."
                  : availableBranches.length === 0
                    ? "No branches"
                    : "Select branch"
              }
            />
          </div>
        </SelectTrigger>

        <SelectContent className="bg-[#0f1e50] text-white border border-white/20">
          {availableBranches.length > 0 ? (
            availableBranches.map((b) => (
              <SelectItem
                className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                key={b}
                value={b}
              >
                {b}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-xs text-slate-300 text-center flex flex-col items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              No branches
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
