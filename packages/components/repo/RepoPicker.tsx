"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import {
  ChevronDown,
  RefreshCw,
  Star,
  Globe,
  LockKeyhole,
  Tag,
  GitBranch,
  GitPullRequest,
} from "lucide-react";
import { usePipeline } from "../workspace/PipelineProvider";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Type Definition
type Repo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch?: string;
  stargazers_count: number;
  forks_count: number;
  owner: { login: string; avatar_url?: string };
  updated_at?: string;
  provider?: "github" | "gitlab";
  _meta?: {
    branchCount: number;
    tagCount: number;
    pipelineCount: number;
    languages: string[];
  } | null;
};

export default function RepoPicker(props: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [me, setMe] = React.useState<{
    login: string;
    avatar_url?: string;
  } | null>(null);
  const [repos, setRepos] = React.useState<Repo[]>([]);

  const { provider, setSelectedRepo, setSelectedBranch } = usePipeline();

  async function loadRepos() {
    setLoading(true);
    try {
      const endpoint =
        provider === "gitlab" ? "/api/gitlab/repos" : "/api/github/repos";

      const res = await fetch(endpoint, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Fetch error");

      setMe(data.me);
      setRepos(data.repos as Repo[]);
    } catch (e) {
      console.error("Load repo error:", e);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open) loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider]);

  const my = React.useMemo(
    () => repos.filter((r) => r.owner?.login === me?.login),
    [repos, me?.login],
  );
  const co = React.useMemo(
    () => repos.filter((r) => r.owner?.login !== me?.login),
    [repos, me?.login],
  );

  function pick(r: Repo) {
    setSelectedRepo(r);
    setSelectedBranch(r.default_branch || "main");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.children ?? (
          <button
            className="ml-1 inline-flex h-8 min-h-9 items-center gap-1.5 rounded-md px-2 py-2 text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
            aria-label="Change repository"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="!max-w-none !w-[700px] !h-[600px] border border-[#B4CAFD]
                   bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
                   text-slate-50 flex flex-col p-6"
      >
        <VisuallyHidden>
          <DialogTitle>Select Repository</DialogTitle>
        </VisuallyHidden>

        <Tabs defaultValue="my" className="w-full flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0 mt-4">
            <TabsList className="h-10 gap-2 bg-transparent p-0">
              <TabsTrigger
                value="my"
                className="text-white rounded-xl px-4 py-2 text-base data-[state=active]:bg-white/15 transition-all"
              >
                My Projects
              </TabsTrigger>
              <TabsTrigger
                value="co"
                className="text-white rounded-xl px-4 py-2 text-base data-[state=active]:bg-white/15 transition-all"
              >
                Co-Projects
              </TabsTrigger>
            </TabsList>

            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-none"
              onClick={loadRepos}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
            {loading ? (
              <GridSkeleton />
            ) : (
              <>
                <TabsContent value="my" className="m-0 mt-0">
                  <RepoGrid repos={my} onPick={pick} />
                </TabsContent>
                <TabsContent value="co" className="m-0 mt-0">
                  <RepoGrid repos={co} onPick={pick} />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RepoGrid({
  repos,
  onPick,
}: {
  repos: Repo[];
  onPick: (r: Repo) => void;
}) {
  if (!repos.length)
    return (
      <div className="p-10 text-center opacity-80 flex flex-col items-center gap-2">
        <Globe className="w-8 h-8 opacity-50" />
        <span>No repositories found</span>
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 pb-4">
      {repos.map((r) => (
        <RepoCard key={r.id} repo={r} onPick={() => onPick(r)} />
      ))}
    </div>
  );
}

function RepoCard({ repo, onPick }: { repo: Repo; onPick: () => void }) {
  const branchCount = repo._meta?.branchCount ?? 0;
  const tagCount = repo._meta?.tagCount ?? 0;
  const pipelineCount = repo._meta?.pipelineCount ?? 0;
  const languages = (repo._meta?.languages ?? []).slice(0, 3);

  // ✅ เช็คว่าเป็น GitHub ไหม?
  const isGithub = repo.provider === "github";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      className="cursor-pointer select-none
                 flex h-56 flex-col justify-between
                 rounded-2xl border border-white/10
                 bg-[linear-gradient(0deg,rgba(0,0,0,0.20)0%,rgba(0,0,0,0.20)100%),radial-gradient(121.01%_173%_at_50%_173%,#2146ba_0%,#0d2b79_40.15%,#061845_100%)]
                 p-4 shadow-lg transition-all duration-200
                 hover:scale-[1.02] hover:bg-[radial-gradient(121.01%_173%_at_50%_173%,#3b6efb_0%,#173bab_40.15%,#0a1e4d_100%)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-semibold truncate pr-2 text-white">
            {repo.name}
          </div>
          <div className="shrink-0">
            {repo.private ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-xs text-white/90 border border-white/10">
                <LockKeyhole className="h-3 w-3" /> Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 border border-emerald-500/30">
                <Globe className="h-3 w-3" /> Public
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-white/70 line-clamp-2 h-8 mb-2 leading-relaxed">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Badges Area */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 🎯 Pipeline: 
              - ถ้าเป็น GitHub: โชว์เสมอ (แม้เป็น 0)
              - ถ้าเป็น GitLab: โชว์เฉพาะตอน > 0
           */}
          {(isGithub || pipelineCount > 0) && (
            <Badge icon={<GitPullRequest className="h-3 w-3 text-blue-300" />}>
              {pipelineCount} {pipelineCount !== 1 ? "pipelines" : "pipeline"}
            </Badge>
          )}

          {/* 🎯 Branch: 
              - ถ้าเป็น GitHub: โชว์เสมอ (แม้เป็น 0)
              - ถ้าเป็น GitLab: โชว์เฉพาะตอน > 0
           */}
          {(isGithub || branchCount > 0) && (
            <Badge icon={<GitBranch className="h-3 w-3" />}>
              {branchCount}
            </Badge>
          )}

          {/* Star: โชว์เฉพาะถ้ามีค่า > 0 (อันนี้เหมือนกันทั้งคู่) */}
          {repo.stargazers_count > 0 && (
            <Badge icon={<Star className="h-3 w-3 text-yellow-400" />}>
              {repo.stargazers_count}
            </Badge>
          )}

          {tagCount > 0 && (
            <Badge icon={<Tag className="h-3 w-3" />}>{tagCount}</Badge>
          )}

          {/* ป้าย Provider สำรอง:
              จะโชว์ก็ต่อเมื่อ ไม่มีอะไรจะโชว์จริงๆ (เช่น GitLab ที่ไม่มีดาว ไม่มี branch ไม่มี pipeline)
           */}
          {!isGithub &&
            pipelineCount === 0 &&
            branchCount === 0 &&
            repo.stargazers_count === 0 && (
              <Badge className="opacity-70 font-semibold uppercase tracking-wider text-xs">
                {repo.provider || "Git"}
              </Badge>
            )}
        </div>

        {/* Languages */}
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {languages.map((lang) => (
              <span
                key={lang}
                className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/80"
              >
                {lang}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Utility Components
function Badge({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white/90 border border-white/5 ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/5"
        />
      ))}
    </div>
  );
}
