"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  History, GitCommit, GitPullRequest, Search,
  Clock, Github, Gitlab, Eye, RotateCcw, FileText, ChevronLeft, GitBranch
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../packages/components/ui/dialog"; // ปรับ Path ให้ตรงกับ ui ของคุณ
import { Button } from "../../packages/components/ui/button"; // ปรับ Path ให้ตรงกับ ui ของคุณ

type HistoryRecord = {
  id: string;
  provider: "github" | "gitlab";
  repoFullName: string;
  branch: string;
  filePath: string;
  commitMessage: string;
  commitUrl: string | null;
  actionType: "push" | "pull_request";
  yamlContent: string;
  createdAt: string;
};

export default function HistoryPage() {
  // Filters State
  const [repoFilter, setRepoFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("");

  // Modal State สำหรับดูโค้ดเก่า
  const [selectedYaml, setSelectedYaml] = useState<HistoryRecord | null>(null);
  const router = useRouter();

  // 🔥 1. ดึง repos ที่ user มี access จริง
  const { data: accessibleRepos } = useQuery({
    queryKey: ["accessible-repos"],
    queryFn: async () => {
      // ลองดึง GitHub ก่อน
      const ghRes = await fetch("/api/github/repos", { credentials: "include" });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        return (ghData.repos || []).map((r: any) => r.full_name) as string[];
      }
      // ถ้า GitHub ไม่ได้ ลอง GitLab
      const glRes = await fetch("/api/gitlab/repos", { credentials: "include" });
      if (glRes.ok) {
        const glData = await glRes.json();
        return (glData.repos || []).map((r: any) => r.full_name) as string[];
      }
      return [] as string[];
    },
  });

  // 🔥 2. ดึงข้อมูล Dropdown (Repo และ Branch ที่มีประวัติ)
  const { data: rawFilterData } = useQuery({
    queryKey: ["pipeline-history-filters"],
    queryFn: async () => {
      const res = await fetch("/api/pipeline/history/filters");
      if (!res.ok) throw new Error("Failed to fetch filters");
      const json = await res.json();
      return json.filters as Record<string, string[]>;
    },
  });

  // 🔥 3. filter เฉพาะ repo ที่มี access จริง
  const filterData = React.useMemo(() => {
    if (!rawFilterData || !accessibleRepos) return rawFilterData;
    const filtered: Record<string, string[]> = {};
    for (const [repo, branches] of Object.entries(rawFilterData)) {
      if (accessibleRepos.includes(repo)) {
        filtered[repo] = branches;
      }
    }
    return filtered;
  }, [rawFilterData, accessibleRepos]);

  // ดึงข้อมูลจาก API ที่เราเพิ่งสร้าง
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pipeline-history", repoFilter, timeFilter, actionFilter, branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFilter,
        time: timeFilter,
        action: actionFilter,
        branch: branchFilter === "all" ? "" : branchFilter, // ถ้าเป็น all ไม่ต้องส่งไปกวน API
      });
      const res = await fetch(`/api/pipeline/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<{ history: HistoryRecord[] }>;
    },
  });

  const history = React.useMemo(() => {
    const raw = data?.history || [];
    if (!accessibleRepos || accessibleRepos.length === 0) return raw;
    return raw.filter((record) => accessibleRepos.includes(record.repoFullName));
  }, [data, accessibleRepos]);

  return (
    <div className="h-screen bg-gradient-to-b from-[#010819] to-[#02184B]/85 text-slate-200 p-6 font-sans flex flex-col overflow-hidden">
      {/* 🔥 ย้ายคอมเมนต์เข้ามาอยู่ข้างใน div ตัวแม่แล้วครับ จะได้ไม่ Error */}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0 space-y-5">

        {/* 1. Header & Back Button */}
        <div className="shrink-0 flex items-center gap-4 border-b border-white/10 pb-4">
          <Link href="/" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors h-fit shrink-0">
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <History className="w-6 h-6 text-blue-400" />
              Activity History
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Track your pipeline changes, commits, and pull requests.
            </p>
          </div>
        </div>

        {/* 2. Filters Bar */}
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#02184B] p-4 rounded-xl border border-white/10 shadow-lg">

          {/* ช่องที่ 1: Repository (Dropdown) */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs text-slate-400 font-medium ml-1">Repository</label>
            <select
              value={repoFilter}
              onChange={(e) => {
                setRepoFilter(e.target.value);
                setBranchFilter("all");
              }}
              className="w-full bg-[#010819] border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none text-white appearance-none cursor-pointer"
            >
              <option value="all">All Repositories</option>
              {filterData && Object.keys(filterData).map((repoName) => (
                <option key={repoName} value={repoName}>
                  {repoName}
                </option>
              ))}
            </select>
          </div>

          {/* ช่องที่ 2: Branch (Dropdown) */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs text-slate-400 font-medium ml-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              disabled={repoFilter === "all"}
              className="w-full bg-[#010819] border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none text-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Branches</option>
              {repoFilter !== "all" && filterData?.[repoFilter]?.map((branchName) => (
                <option key={branchName} value={branchName}>
                  {branchName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs text-slate-400 font-medium ml-1">Time Range</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full bg-[#010819] border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none text-white appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Last 24 Hours</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-xs text-slate-400 font-medium ml-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-[#010819] border border-white/10 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none text-white appearance-none"
            >
              <option value="all">All Actions</option>
              <option value="push">Direct Push</option>
              <option value="pull_request">Pull Request</option>
            </select>
          </div>
        </div>

        {/* 3. History List */}
        <div className="flex-1 overflow-y-auto pr-2 pb-12 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="text-center py-20 text-slate-500 animate-pulse">Loading history...</div>
          ) : isError ? (
            <div className="text-center py-20 text-red-400">Failed to load history. Please try again.</div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5 border-dashed">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-300">No activity found</h3>
              <p className="text-sm text-slate-500">Try adjusting your filters.</p>
            </div>
          ) : (
            history.map((record) => (
              <div key={record.id} className="bg-[#02184B]/60 hover:bg-[#02184B] transition-colors p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm group">
                {/* Provider Icon */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  {record.provider === "gitlab" ? <Gitlab className="w-5 h-5 text-orange-400" /> : <Github className="w-5 h-5 text-white" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate">{record.commitMessage}</span>
                    {record.actionType === "pull_request" ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
                        <GitPullRequest className="w-3 h-3" /> PR
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/20">
                        <GitCommit className="w-3 h-3" /> Push
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-blue-300 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {record.repoFullName}
                    </span>
                    {record.branch && (
                      <span className="flex items-center gap-1 text-emerald-300 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <GitBranch className="w-3 h-3" /> {record.branch}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {record.filePath}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  {record.commitUrl && (
                    <a href={record.commitUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">
                        View Git
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-2"
                    onClick={() => setSelectedYaml(record)}
                  >
                    <Eye className="w-4 h-4" /> View Code
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Rollback / View Code Modal */}
      <Dialog open={!!selectedYaml} onOpenChange={(open) => !open && setSelectedYaml(null)}>
        <DialogContent
          className="border-slate-700 bg-[#02184B] text-slate-100"
          style={{ maxWidth: "90vw", width: "800px" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Past Version: {selectedYaml?.filePath}</span>
            </DialogTitle>
          </DialogHeader>
          <div
            className="bg-[#010819] p-5 rounded-lg overflow-auto border border-white/10 font-mono text-sm text-slate-300 no-scrollbar"
            style={{ maxHeight: "70vh" }}
          >
            <pre><code>{selectedYaml?.yamlContent}</code></pre>
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className="text-xs text-slate-400">
              <span className="text-blue-300">Message:</span> {selectedYaml?.commitMessage}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setSelectedYaml(null)}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                Close
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                onClick={() => {
                  if (!selectedYaml) return;
                  sessionStorage.setItem("rollback_yaml", selectedYaml.yamlContent);
                  sessionStorage.setItem("rollback_repo", selectedYaml.repoFullName);
                  sessionStorage.setItem("rollback_branch", selectedYaml.branch);
                  sessionStorage.setItem("rollback_path", selectedYaml.filePath);
                  setSelectedYaml(null);
                  router.push("/");
                }}
              >
                <RotateCcw className="w-4 h-4" /> Rollback Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}