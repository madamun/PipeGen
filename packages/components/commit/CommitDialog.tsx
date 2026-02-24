"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { usePipeline } from "../workspace/PipelineProvider";
import { GitBranch, GitPullRequest, UploadCloud, Sparkles } from "lucide-react";

type Mode = "pull_request" | "push";
type Branch = { name: string; protected?: boolean };

type Props = { open?: boolean; onOpenChange?: (v: boolean) => void };

export default function CommitDialog(props: Props) {
  const { selectedRepo, selectedBranch, fileContent, selectedFile, provider, originalContent } =
    usePipeline();

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
  const [step, setStep] = React.useState<"form" | "preview">("form");

  // คำนวณ Path ตามค่าย
const targetPath = React.useMemo(() => {
    const fileName = selectedFile || (provider === "gitlab" ? ".gitlab-ci.yml" : "pipeline.yml");

    if (provider === "github") {
      return fileName.includes("/") ? fileName : `.github/workflows/${fileName}`;
    } else if (provider === "gitlab") {
      // ความฉลาด: ถ้าชื่อไม่ใช่ไฟล์หลัก และยังไม่มีโฟลเดอร์ ให้ยัดเข้า .gitlab/ci/ อัตโนมัติ
      if (fileName === ".gitlab-ci.yml" || fileName.includes("/")) {
        return fileName;
      }
      return `.gitlab/ci/${fileName}`;
    }
    return fileName;
  }, [selectedFile, provider]);

  React.useEffect(() => {
    if (!open) return;

    // ตั้งค่า branch เริ่มต้น
    setBranch(selectedBranch || selectedRepo?.default_branch || "main");

    if (!selectedRepo?.full_name) {
      setBranches([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingBranches(true);

        // ✅ FIX 1: เลือก API Endpoint ตาม Provider
        const endpoint =
          provider === "gitlab"
            ? `/api/gitlab/branches`
            : `/api/github/branches`;

        const res = await fetch(
          `${endpoint}?full_name=${encodeURIComponent(selectedRepo.full_name)}`,
          { cache: "no-store" },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load branches");
        if (cancelled) return;

        const list: Branch[] = data.branches || [];
        setBranches(list);

        // Auto-select branch logic
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
    provider, // dependency
  ]);

  const branchNames = React.useMemo(
    () => branches.map((b) => b.name),
    [branches],
  );
  const selectValue = branchNames.includes(branch) ? branch : undefined;

  const disabled = !selectedRepo?.full_name || !fileContent?.trim();

  const displayFileName = selectedFile || (provider === "gitlab" ? ".gitlab-ci.yml" : "workflow");

  function generateTitle() {
    const t =
      mode === "pull_request"
        ? provider === "gitlab"
          ? `Update CI: ${displayFileName}`
          : `Update workflow: ${displayFileName}`
        : `Update ${displayFileName}`;
    setTitle(t);
  }

  function generateDescription() {
    const desc = `Update ${displayFileName} via PipeGen\n\nTarget: ${targetPath}\nBranch: ${branch || "main"}`;
    setMessage(desc);
  }

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) setStep("form");
      setOpen(next);
    },
    [setOpen],
  );

  const isUpdate = typeof originalContent === "string" && originalContent.trim().length > 0;

  async function onSubmit() {
    if (disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // ✅ FIX 2: ยิง API ตาม Provider
      const endpoint =
        provider === "gitlab" ? `/api/gitlab/commit` : `/api/github/commit`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: selectedRepo!.full_name, // GitLab ต้องการ namespace/project
          repoFullName: selectedRepo!.full_name, // (เผื่อ API เก่าใช้ชื่อนี้)
          baseBranch: branch || "main",
          branch: branch || "main", // (เผื่อ API เก่าใช้ชื่อนี้)
          mode,
          title: title || `Update ${selectedFile}`,
          message: message || `Update ${selectedFile} via PipeGen`,
          path: targetPath, // ✅ ส่ง Path ที่ถูกต้องไป
          filePath: targetPath, // (เผื่อ API เก่าใช้ชื่อนี้)
          content: fileContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Commit failed");
        return;
      }

      // เปิดลิงก์ PR/MR หรือ Commit
      if (data?.html_url) window.open(data.html_url, "_blank");

      setOpen(false);
    } catch {
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            className="bg-[#3b82f6] hover:bg-[#2f6ad6] w-24"
            title={disabled ? "Select a repository and a file to commit" : undefined}
          >
            Commit
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        key={selectedRepo?.full_name || "no-repo"}
        className="max-w-[28rem] w-full border border-[#B4CAFD] text-slate-50
        bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {step === "preview" ? (
              "Commit preview"
            ) : (
              <>
                {provider === "gitlab" ? (
                  <span className="text-orange-500">🦊</span>
                ) : (
                  <span className="text-white">🐙</span>
                )}
                Push to{" "}
                <span className="underline text-teal-300 truncate max-w-52">
                  {selectedRepo?.name ?? "—"}
                </span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
        <div className="space-y-4">
          {/* แสดง Target Path ให้ชัดเจน */}
          <div className="text-xs text-slate-300 bg-black/20 p-2 rounded flex items-center gap-2 font-mono">
            <UploadCloud className="w-3 h-3 text-blue-400" />
            Target: <span className="text-green-300">{targetPath}</span>
          </div>

          {/* Branch Select */}
          <div className="space-y-2">
            <Label className="text-slate-200">Branch :</Label>
            <Select
              value={selectValue}
              onValueChange={setBranch}
              disabled={loadingBranches || branches.length === 0}
            >
              <SelectTrigger className="bg-black/30 border-white/10 min-w-28">
                <SelectValue
                  placeholder={
                    loadingBranches ? "Loading branches..." : "Select a branch"
                  }
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
            <div className="flex items-center justify-between gap-2">
              <Label className="text-slate-200">Title</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-xs border border-white/30 text-slate-300 hover:bg-white/10 gap-1"
                onClick={generateTitle}
              >
                <Sparkles className="h-3 w-3" />
                Generate
              </Button>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                mode === "pull_request"
                  ? provider === "gitlab"
                    ? "Merge Request Title"
                    : "Pull Request Title"
                  : "Commit Title"
              }
              className="bg-black/30 border-white/10"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-slate-200">Commit Message</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-xs border border-white/30 text-slate-300 hover:bg-white/10 gap-1"
                onClick={generateDescription}
              >
                <Sparkles className="h-3 w-3" />
                Generate
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Description..."
              className="min-h-20 bg-black/30 border-white/10"
            />
          </div>

          {/* Push Type */}
          <div className="space-y-2">
            <Label className="text-slate-200">Action Type</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="flex flex-col gap-3"
            >
              <label
                className={`flex items-center gap-3 cursor-pointer p-2 rounded border transition-all ${mode === "pull_request" ? "bg-white/10 border-blue-400" : "border-transparent hover:bg-white/5"}`}
              >
                <RadioGroupItem value="pull_request" id="r-pr" />
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-purple-300" />
                  <span className="text-sm">
                    {provider === "gitlab"
                      ? "Merge Request (MR)"
                      : "Pull Request (PR)"}
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 cursor-pointer p-2 rounded border transition-all ${mode === "push" ? "bg-white/10 border-blue-400" : "border-transparent hover:bg-white/5"}`}
              >
                <RadioGroupItem value="push" id="r-push" />
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-green-300" />
                  <span className="text-sm">Direct Push</span>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="w-full h-0.5 bg-[#3b82f6]/30 my-2"></div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full bg-[#3b82f6] hover:bg-[#2f6ad6] text-white rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={() => setStep("preview")}
              title={disabled ? "Select a repository and a file to commit" : undefined}
            >
              Preview
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
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-sm text-slate-200 space-y-2 bg-black/20 rounded-lg p-3 font-mono">
              <div><span className="text-slate-400">Repo:</span> {selectedRepo?.full_name ?? "—"}</div>
              <div><span className="text-slate-400">Branch:</span> {branch || "main"}</div>
              <div><span className="text-slate-400">File:</span> {targetPath}</div>
              <div><span className="text-slate-400">Action:</span> {mode === "pull_request" ? (provider === "gitlab" ? "Merge Request" : "Pull Request") : "Direct Push"}</div>
              <div><span className="text-slate-400">Summary:</span> {isUpdate ? "Will update 1 file" : "Will create new file"}</div>
            </div>
            <div className="text-xs text-slate-300 bg-black/20 p-2 rounded">
              <span className="text-slate-400">Message:</span>
              <pre className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                {message || title || `Update ${displayFileName} via PipeGen`}
              </pre>
            </div>
            <p className="text-xs text-slate-400">
              You can review changes in Diff mode in the editor on the right.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                className="w-full bg-[#3b82f6] hover:bg-[#2f6ad6] text-white rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? "Pushing..." : "Confirm and commit"}
              </Button>
              <Button
                variant="secondary"
                className="w-full border border-white/50 text-white bg-transparent hover:bg-white/10 rounded-lg py-2"
                onClick={() => setStep("form")}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
