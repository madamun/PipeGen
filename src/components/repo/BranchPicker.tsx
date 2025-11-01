// src/components/repo/BranchPicker.tsx
"use client";

import * as React from "react";
import { usePipeline } from "@/components/workspace/PipelineProvider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function BranchPicker() {
  const { selectedRepo, selectedBranch, setSelectedBranch } = usePipeline();
  const [branches, setBranches] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedRepo) { setBranches([]); setError(null); return; }

    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/github/branches?full_name=${encodeURIComponent(selectedRepo.full_name)}`,
          { cache: "no-store" }
        );
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); }
        catch { throw new Error(`Non-JSON response: ${text.slice(0, 80)}`); }

        if (!res.ok) throw new Error(data?.error || "Failed to load branches");

        if (!abort) {
          const list = (data.branches ?? []).map((b: any) => b.name || b);
          setBranches(list);
          // seed default ถ้ายังไม่ได้เลือก
          if (!selectedBranch) {
            setSelectedBranch((selectedRepo as any).default_branch || "main");
          }
        }
      } catch (e: any) {
        if (!abort) { setError(e.message); setBranches([]); }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => { abort = true; };
    // เปลี่ยนเมื่อเปลี่ยน repo เท่านั้น
  }, [selectedRepo?.full_name]);

  if (!selectedRepo) return <span className="text-slate-400 text-sm italic">—</span>;

  return (
    <Select
      value={selectedBranch || ""}
      onValueChange={(v) => setSelectedBranch(v)}
      disabled={loading || (!!error) || branches.length === 0}
    >
      <SelectTrigger className="h-6 w-[170px] text-white bg-[#0f1e50] border border-white/20">
        <SelectValue
          placeholder={
            error ? "Load error"
            : loading ? "Loading…"
            : branches.length ? "Select branch" : "No branches"
          }
        />
      </SelectTrigger>
      <SelectContent className="bg-[#0f1e50] text-white border border-white/20">
        {branches.map((b) => (
          <SelectItem className="text-white hover:bg-white/10 cursor-pointer" key={b} value={b}>{b}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
