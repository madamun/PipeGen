// src/components/commit/CommitDialog.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePipeline } from "@/components/workspace/PipelineProvider";

type Mode = "pull_request" | "push";
type Branch = { name: string; protected?: boolean };

type Props = { open?: boolean; onOpenChange?: (v: boolean) => void };

export default function CommitDialog(props: Props) {
  // ✅ 1. เพิ่ม selectedFile เข้ามาด้วย
  const { selectedRepo, selectedBranch, fileContent, selectedFile } = usePipeline();

  const isControlled = typeof props.open === "boolean" && !!props.onOpenChange;
  const [innerOpen, setInnerOpen] = React.useState(false);
  const open = isControlled ? (props.open as boolean) : innerOpen;
  const setOpen = isControlled
    ? (props.onOpenChange as (v: boolean) => void)
    : setInnerOpen;

  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("push");

  const [branch, setBranch] = React.useState<string>("main");
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    // ตั้งค่า branch เริ่มต้นจากที่เลือกไว้ใน Provider
    setBranch(selectedBranch || selectedRepo?.default_branch || "main");

    if (!selectedRepo?.full_name) {
      setBranches([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingBranches(true);
        const res = await fetch(
          `/api/github/branches?full_name=${encodeURIComponent(
            selectedRepo.full_name
          )}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load branches");
        if (cancelled) return;

        const list: Branch[] = data.branches || [];
        setBranches(list);

        // Logic เลือก branch อัตโนมัติถ้าไม่มีใน list
        const names = list.map((b) => b.name);
        if (!names.includes(selectedBranch || "")) {
          const pref =
            (selectedRepo?.default_branch &&
              names.includes(selectedRepo.default_branch) &&
              selectedRepo.default_branch) ||
            (names.includes("main") ? "main" : names[0] || "main");
          setBranch(pref);
        }
      } catch (e) {
        console.error("load branches:", e);
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedRepo?.full_name,
    selectedRepo?.default_branch,
    selectedBranch,
  ]);

  const branchNames = React.useMemo(
    () => branches.map((b) => b.name),
    [branches]
  );
  const selectValue = branchNames.includes(branch) ? branch : undefined;

  const disabled = !selectedRepo?.full_name || !fileContent?.trim();

  async function onSubmit() {
    if (disabled || isSubmitting) return;

    // ✅ 2. สร้าง Path จริง โดยใช้ชื่อไฟล์ที่ user ตั้ง
    // ถ้า selectedFile ไม่มีค่า ให้ fallback เป็น pipeline.yml
    const fileName = selectedFile || "pipeline.yml";
    const fullPath = `.github/workflows/${fileName}`;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/github/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: selectedRepo!.full_name,
          baseBranch: branch || "main",
          mode,
          title: title || `Update ${fileName}`, // ใช้ชื่อไฟล์ใน Title ด้วยก็ดีครับ
          message: message || `Update ${fileName} via PipeGen`,
          path: fullPath, // ✅ ส่ง Path ที่ถูกต้องไป
          content: fileContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Commit failed");
        return;
      }
      if (data?.html_url) window.open(data.html_url, "_blank");
      setOpen(false);
    } catch (error) {
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-[#3b82f6] hover:bg-[#2f6ad6] w-24">
            Commit
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        key={selectedRepo?.full_name || "no-repo"}
        className="w-[400px] border border-[#B4CAFD] text-slate-50
        bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            Push to{" "}
            <span className="underline text-teal-300">
              {selectedRepo?.name ?? "—"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
           {/* แสดงให้ User เห็นว่าจะ Commit ไปที่ไฟล์ไหน (Optional แต่แนะนำ) */}
           <div className="text-xs text-slate-300 bg-black/20 p-2 rounded">
              Target: <span className="text-green-300 font-mono">.github/workflows/{selectedFile || "pipeline.yml"}</span>
           </div>

          {/* Branch Select */}
          <div className="space-y-2">
            <Label className="text-slate-200">Branch :</Label>
            <Select
              value={selectValue}
              onValueChange={setBranch}
              disabled={loadingBranches || branches.length === 0}
            >
              <SelectTrigger className="bg-black/30 border-white/10 min-w-[110px]">
                <SelectValue
                  placeholder={loadingBranches ? "Loading…" : "Select a branch"}
                />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1e50] text-white border border-white/20">
                {branches.map((b) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                    {b.protected ? " (protected)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-slate-200">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title for commit/PR"
              className="bg-black/30 border-white/10"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-slate-200">Commit Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Description..."
              className="min-h-[80px] bg-black/30 border-white/10"
            />
          </div>

          {/* Push Type */}
          <div className="space-y-2">
            <Label className="text-slate-200">Push Type</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="flex flex-col gap-3"
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <RadioGroupItem value="pull_request" id="r-pr" />
                <span className="text-sm">Pull Request</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <RadioGroupItem value="push" id="r-push" />
                <span className="text-sm">Push </span>
              </label>
            </RadioGroup>
          </div>

          <div className="w-full h-[2px] bg-[#3b82f6]"></div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full bg-[#3b82f6] hover:bg-[#2f6ad6] text-white rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled || isSubmitting}
              onClick={onSubmit}
            >
              {isSubmitting ? "Pushing..." : "Propose Push"}
            </Button>
            <Button
              variant="secondary"
              className="w-full border border-white/50 text-white bg-transparent hover:bg-white/10 rounded-lg py-2"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}