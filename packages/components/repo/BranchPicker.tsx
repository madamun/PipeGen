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
import { RefreshCw, AlertCircle } from "lucide-react";

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

  const [isSyncing, setIsSyncing] = React.useState(false);

  // 2. Logic ใหม่: เมื่อ Repo เปลี่ยน ให้สั่ง Provider ไปดึง Branch
  React.useEffect(() => {
    if (selectedRepo?.full_name) {
      fetchBranches(selectedRepo.full_name);
    }
  }, [selectedRepo?.full_name, fetchBranches]);

  // 3. Logic Sync: (เหมือนเดิม)
  React.useEffect(() => {
    if (!selectedRepo || !selectedBranch) return;

    const syncPipelines = async () => {
      try {
        setIsSyncing(true);

        await fetch("/api/pipeline/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoFullName: selectedRepo.full_name,
            branch: selectedBranch,
            provider: provider,
          }),
        });
      } catch (e) {
        console.error("Sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    };

    const timer = setTimeout(() => syncPipelines(), 500);
    return () => clearTimeout(timer);
  }, [selectedRepo, selectedBranch, provider]);

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
        <SelectTrigger className="h-8 min-w-44 w-44 text-white bg-[#0f1e50] border border-white/20 text-sm">
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

      {isSyncing && (
        <RefreshCw className="h-3 w-3 text-slate-400 animate-spin" />
      )}
    </div>
  );
}
