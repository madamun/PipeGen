// src/components/repo/RepoPicker.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronDown, RefreshCw, Star, GitFork, Globe, LockKeyhole, Tag, GitBranch } from "lucide-react";
import { usePipeline } from "@/components/workspace/PipelineProvider";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type Repo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  visibility?: string;
  default_branch?: string;
  language?: string;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  owner: { login: string; avatar_url?: string };
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
  updated_at?: string;
  _meta?: {
    branchCount: number;
    tagCount: number;
    pipelineCount: number;
    languages: string[];
  } | null;
};

export default function RepoPicker() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState<{ login: string; avatar_url?: string } | null>(null);
  const [repos, setRepos] = React.useState<Repo[]>([]);
  const { setSelectedRepo, setSelectedBranch } = usePipeline();

  async function loadRepos() {
    setLoading(true);
    try {
      const res = await fetch("/api/github/repos", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fetch error");
      setMe(data.me);
      setRepos(data.repos as Repo[]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && repos.length === 0) loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const my = React.useMemo(() => repos.filter((r) => r.owner?.login === me?.login), [repos, me?.login]);
  const co = React.useMemo(() => repos.filter((r) => r.owner?.login !== me?.login), [repos, me?.login]);

  // 👉 เลือกการ์ดแล้ว set repo + ตั้ง branch เริ่มต้นเป็น "main" แล้วปิด dialog
  function pick(r: Repo) {
    setSelectedRepo(r);
    setSelectedBranch("main"); // ตั้ง default เป็น main ตามที่ขอ (จะเปลี่ยนทีหลังได้จากตัวเลือก branch)
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="ml-1 inline-flex h-8 items-center gap-1 rounded-md px-2 text-slate-200 hover:bg-white/10"
          aria-label="Change repository"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent
        className="!max-w-none !w-[700px] !h-[600px] border border-[#B4CAFD]
                   bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
                   text-slate-50"
      >
        <VisuallyHidden>
          <DialogTitle>Select Repository</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex items-center justify-between">
          <Tabs defaultValue="my" className="w-full">
            <TabsList className="h-10 gap-1 bg-transparent">
              <TabsTrigger value="my" className="text-white rounded-xl px-4 py-2 text-base data-[state=active]:bg-white/15">
                My-Project
              </TabsTrigger>
              <TabsTrigger value="co" className="text-white rounded-xl px-4 py-2 text-base data-[state=active]:bg-white/15">
                Co-Project
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto -mt-10 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/30 hover:bg-white/20"
                onClick={loadRepos}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="max-h-[480px] overflow-y-auto no-scrollbar">
              {loading ? (
                <GridSkeleton />
              ) : (
                <>
                  <TabsContent value="my" className="m-0">
                    <RepoGrid repos={my} onPick={pick} />
                  </TabsContent>
                  <TabsContent value="co" className="m-0">
                    <RepoGrid repos={co} onPick={pick} />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RepoGrid({ repos, onPick }: { repos: Repo[]; onPick: (r: Repo) => void }) {
  if (!repos.length) return <div className="p-10 text-center opacity-80">No repositories</div>;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
      {repos.map((r) => (
        <RepoCard key={r.id} repo={r} onPick={() => onPick(r)} />
      ))}
    </div>
  );
}

function RepoCard({ repo, onPick }: { repo: Repo; onPick: () => void }) {
  return (
    <div
      onClick={onPick}
      role="button"
      className="cursor-pointer select-none
                 flex h-[235px] flex-col
                 rounded-2xl border border-white/10
                 bg-[linear-gradient(0deg,rgba(0,0,0,0.20)0%,rgba(0,0,0,0.20)100%),radial-gradient(121.01%_173%_at_50%_173%,#2146ba_0%,#0d2b79_40.15%,#061845_100%)]
                 p-4 shadow-lg
                 hover:bg-[radial-gradient(121.01%_173%_at_50%_173%,#3b6efb_0%,#173bab_40.15%,#0a1e4d_100%)]"
    >
      {/* header + description */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <div className=" text-base font-semibold">{repo.name}</div>
          <div className="flex items-center gap-2 text-[11px] opacity-90">
            {repo.private ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-[2px]">
                <LockKeyhole className="h-3 w-3" /> private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-[2px]">
                <Globe className="h-3 w-3" /> public
              </span>
            )}
          </div>
        </div>
        <p className=" text-sm text-white/80">{repo.description}</p>
      </div>

      {/* badges + languages — ดันไว้ล่างสุด */}
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
        <Badge icon={<GitBranch className="h-3 w-3" />}>
          {(repo._meta?.branchCount ?? 0)} Branch
        </Badge>
        <Badge icon={<Star className="h-3 w-3" />}>{repo.stargazers_count} Star</Badge>
        <Badge icon={<Tag className="h-3 w-3" />}>{repo._meta?.tagCount ?? 0} Tags</Badge>
        <Badge>{repo._meta?.pipelineCount ?? 0} Pipelines</Badge>

        <div className="flex flex-wrap gap-2">
          {(repo._meta?.languages ?? []).slice(0, 6).map((lang) => (
            <span key={lang} className="rounded-full bg-white/10 px-2 py-[2px] text-xs">
              {lang}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-[2px]">
      {icon}
      {children}
    </span>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[250px] animate-pulse rounded-2xl bg-white/10" />
      ))}
    </div>
  );
}
