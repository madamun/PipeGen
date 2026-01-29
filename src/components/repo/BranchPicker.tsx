// src/components/repo/BranchPicker.tsx
"use client";

import * as React from "react";
import { usePipeline } from "@/components/workspace/PipelineProvider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react"; // (Optional) เพิ่ม icon หมุนๆ ถ้าอยากโชว์สถานะ

export default function BranchPicker() {
  const { selectedRepo, selectedBranch, setSelectedBranch } = usePipeline();
  const [branches, setBranches] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // State สำหรับดูว่ากำลัง Sync Pipeline อยู่ไหม
  const [isSyncing, setIsSyncing] = React.useState(false);

  // 1. Logic เดิม: ดึงรายชื่อ Branch จาก GitHub
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
          // seed default ถ้ายังไม่ได้เลือก หรือค่าเดิมไม่อยู่ใน list ใหม่
          if (!selectedBranch || (list.length > 0 && !list.includes(selectedBranch))) {
             // ใช้ default branch ของ repo หรือถ้าไม่มีเอาตัวแรกของ list
            const defaultBranch = (selectedRepo as any).default_branch || "main";
            setSelectedBranch(list.includes(defaultBranch) ? defaultBranch : list[0]);
          }
        }
      } catch (e: any) {
        if (!abort) { setError(e.message); setBranches([]); }
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => { abort = true; };
  }, [selectedRepo?.full_name, selectedBranch, setSelectedBranch, selectedRepo]); 
  // (เพิ่ม dependency ให้ครบตาม lint)

  // ✨ 2. Logic ใหม่: เมื่อ Branch เปลี่ยน ให้สั่ง Sync Pipeline ทันที
  React.useEffect(() => {
    if (!selectedRepo || !selectedBranch) return;

    const syncPipelines = async () => {
       try {
         setIsSyncing(true);
         // console.log(`Syncing pipelines for branch: ${selectedBranch}...`);
         
         await fetch('/api/pipeline/sync', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
              repoFullName: selectedRepo.full_name,
              branch: selectedBranch 
           })
         });
         
         // console.log("Pipelines synced!");
         // (Optional) ตรงนี้คุณอาจจะสั่งให้โหลด Pipeline List ใหม่ก็ได้ถ้ามี UI แสดงรายการ
       } catch (e) {
         console.error("Sync failed", e);
       } finally {
         setIsSyncing(false);
       }
    };

    // ใส่ Timeout นิดนึงกันรัว (Debounce เล็กๆ) หรือเรียกเลยก็ได้
    const timer = setTimeout(() => syncPipelines(), 500);
    return () => clearTimeout(timer);

  }, [selectedRepo, selectedBranch]);

  if (!selectedRepo) return <span className="text-slate-400 text-sm italic">—</span>;

  return (
    <div className="flex items-center gap-2">
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
            <SelectItem className="text-white hover:bg-white/10 cursor-pointer" key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* (Optional) แสดง Icon หมุนๆ ตอนกำลัง Sync */}
      {isSyncing && <RefreshCw className="h-3 w-3 text-slate-400 animate-spin" />}
    </div>
  );
}