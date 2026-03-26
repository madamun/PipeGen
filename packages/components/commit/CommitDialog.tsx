"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { usePipeline } from "../workspace/PipelineProvider";
import { ChevronDown, GitBranch, GitPullRequest, UploadCloud, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Mode = "pull_request" | "push";

const VALID_BRANCH_REGEX = /^[a-zA-Z0-9/_.-]+$/;
function isValidBranchName(name: string): boolean {
  const t = name.trim();
  return t.length > 0 && t.length <= 200 && VALID_BRANCH_REGEX.test(t);
}

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
  const [branchDropdownOpen, setBranchDropdownOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "preview">("form");

  const targetPath = React.useMemo(() => {
    const fileName =
      selectedFile ||
      (provider === "gitlab" ? ".gitlab-ci.yml" : "pipeline.yml");

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

  const {
    data: branchNames = [],
    isLoading: loadingBranches,
    isError: isErrorBranches,
    error: errorBranches,
  } = useQuery({
    queryKey: ["branches", selectedRepo?.full_name, provider],
    queryFn: async () => {
      if (!selectedRepo?.full_name) return [];
      const endpoint =
        provider === "gitlab"
          ? `/api/gitlab/branches`
          : `/api/github/branches`;
      const res = await fetch(
        `${endpoint}?full_name=${encodeURIComponent(selectedRepo.full_name)}`,
        { cache: "no-store", credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to load branches");
      return (data.branches || []).map((b: { name: string }) => b.name) as string[];
    },
    enabled: open && !!selectedRepo?.full_name,
  });

  React.useEffect(() => {
    if (!open) return;
    const pref = selectedBranch || selectedRepo?.default_branch || "main";
    setBranch(branchNames.includes(pref) ? pref : branchNames[0] || "main");
  }, [open, selectedBranch, selectedRepo?.default_branch, branchNames]);

  const branchValid =
    branch.trim() !== "" &&
    (branchNames.includes(branch) || isValidBranchName(branch));
  const disabled =
    !selectedRepo?.full_name ||
    !fileContent?.trim() ||
    !branchValid;

  const displayFileName = selectedFile || (provider === "gitlab" ? ".gitlab-ci.yml" : "workflow");

  const generateTitle = React.useCallback(() => {
    const t =
      mode === "pull_request"
        ? provider === "gitlab"
          ? `Update CI: ${displayFileName}`
          : `Update workflow: ${displayFileName}`
        : `Update ${displayFileName}`;
    setTitle(t);
  }, [mode, provider, displayFileName]);

  const generateDescription = React.useCallback(() => {
    const desc = `Update ${displayFileName} via PipeGen\n\nTarget: ${targetPath}\nBranch: ${branch || "main"}`;
    setMessage(desc);
  }, [displayFileName, targetPath, branch]);

  const prevTargetPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (open && targetPath !== prevTargetPath.current) {
      prevTargetPath.current = targetPath;
      setTitle("");
      setMessage("");
    }
  }, [open, targetPath]);
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setTimeout(() => {
          setStep("form");
          setBranchDropdownOpen(false);
          setTitle("");
          setMessage("");
        }, 300);
      }
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

      const baseBranch =
        selectedRepo?.default_branch || "main";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: selectedRepo!.full_name,
          repoFullName: selectedRepo!.full_name,
          baseBranch,
          branch: branch.trim() || baseBranch,
          mode,
          title: title || `Update ${selectedFile}`,
          message: message || `Update ${selectedFile} via PipeGen`,
          path: targetPath,
          filePath: targetPath,
          content: fileContent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string })?.error || res.statusText || "Commit failed";
        const detail = (data as { detail?: string })?.detail;
        toast.error(msg, detail ? { description: detail } : undefined);
        return;
      }

      const url = data?.html_url as string | undefined;

      const successMsg =
        mode === "pull_request" ? "Pull request created" : "Changes pushed";

      toast.success(successMsg, {
        description: url ? "Open in new tab to view." : undefined,
        duration: Infinity,
        action: url
          ? { label: "Open", onClick: () => window.open(url, "_blank") }
          : undefined,
      });

      handleOpenChange(false);

    } catch (err) {
      toast.error((err as Error)?.message || "Network or server error");
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
        bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)] [&>button]:hidden"
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

            {/* Branch: input (type) + button (open dropdown to select) */}
            <div className="space-y-2">
              <Label className="text-slate-200">Branch</Label>
              <p className="text-xs text-slate-400">Select existing branch or type a new name to create one.</p>
              <div className="flex rounded-md border border-white/20 bg-[#0f1e50] overflow-hidden">
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder={loadingBranches ? "Loading..." : "Select or type new branch name..."}
                  disabled={loadingBranches}
                  className="bg-black/30 border-white/10"
                  aria-invalid={branch.trim() !== "" && !branchValid}
                />
                <Popover open={branchDropdownOpen} onOpenChange={setBranchDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={loadingBranches || branchNames.length === 0}
                      className="flex items-center justify-center px-2 border-l border-white/20 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                      aria-label="Open branch list"
                    >
                      <ChevronDown className="w-4 h-4" aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={4}
                    className="min-w-[var(--radix-popover-trigger-width)] max-h-60 overflow-auto p-1 bg-[#0f1e50] text-white border border-white/20 rounded-md"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {branchNames.length === 0 ? (
                      <p className="px-2 py-1.5 text-sm text-slate-400">No branches</p>
                    ) : (
                      branchNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setBranch(name);
                            setBranchDropdownOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 focus:bg-white/10 outline-none cursor-pointer"
                        >
                          {name}
                        </button>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {branch.trim() !== "" && !branchNames.includes(branch) && !isValidBranchName(branch) && (
                <p className="text-xs text-amber-300">
                  Use only letters, numbers, /, -, _, and .
                </p>
              )}
              {branch.trim() !== "" && !branchNames.includes(branch) && isValidBranchName(branch) && (
                <p className="text-xs text-slate-400">
                  New branch will be created from {selectedRepo?.default_branch || "main"}.
                </p>
              )}
              {isErrorBranches && errorBranches && (
                <p className="text-xs text-amber-300">
                  Could not load branches: {errorBranches instanceof Error ? errorBranches.message : "Unknown error"}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-slate-200">Title</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs border border-white/30 text-slate-500 hover:bg-white/10 hover:text-slate-300 gap-1"
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
                  className="h-7 text-xs border border-white/30 text-slate-500 hover:bg-white/10 hover:text-slate-300 gap-1"
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
              <div><span className="text-slate-400">Branch:</span> {branch?.trim() || "main"}</div>
              <div><span className="text-slate-400">File:</span> {targetPath}</div>
              <div><span className="text-slate-400">Action:</span>{
                mode === "pull_request"
                  ? (provider === "gitlab" ? " Merge Request" : " Pull Request")
                  : " Direct Push"
              }</div>
              <div><span className="text-slate-400">Summary:</span> {isUpdate ? "Will update 1 file" : "Will create new file"}</div>
            </div>
            <div className="text-xs text-slate-300 bg-black/20 p-2 rounded">
              <span className="text-slate-400">Message:</span>
              <pre className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                {message || title || `Update ${displayFileName} via PipeGen`}
              </pre>
            </div>
            <p className="text-xs text-slate-400">
              Review changes using Diff in the editor.
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
