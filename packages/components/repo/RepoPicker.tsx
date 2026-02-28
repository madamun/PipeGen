"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
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
  Github,
  Gitlab,
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
  const [isGitlabManagerOpen, setIsGitlabManagerOpen] = React.useState(false);
  const { provider, setSelectedRepo, setSelectedBranch } = usePipeline();
  const {
    data: reposData,
    isLoading: loading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["repos", provider],
    queryFn: async () => {
      const endpoint =
        provider === "gitlab" ? "/api/gitlab/repos" : "/api/github/repos";
      const res = await fetch(endpoint, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error((data as { error?: string })?.error || "Fetch error");
      return {
        me: data.me as { login: string; avatar_url?: string } | null,
        repos: (data.repos || []) as Repo[],
      };
    },
    enabled: open && !!provider,
  });

  const me = reposData?.me ?? null;
  const repos = reposData?.repos ?? [];
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

  const handleManageRepos = () => {
    if (provider === "github") {
      window.open("https://github.com/apps/pipegen-ci/installations/new", "_blank");
    } else if (provider === "gitlab") {
      setIsGitlabManagerOpen(true); // เปิดหน้าต่างของ GitLab แทน
    }
  };

  return (
    <>
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

              {/* กลุ่มปุ่ม Action ฝั่งขวา (Manage & Refresh) */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent border-white/30 hover:bg-white/10 text-slate-200 transition-colors"
                  onClick={handleManageRepos}
                  title="Manage repository access"
                >
                  {provider === "github" ? (
                    <Github className="mr-2 h-4 w-4" />
                  ) : (
                    <Gitlab className="mr-2 h-4 w-4" />
                  )}
                  Manage Access
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent border-white/30 hover:bg-white/10 text-slate-200 transition-colors"
                  onClick={() => refetch()}
                  disabled={loading || isFetching}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading || isFetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
              {isError && error ? (
                <div className="p-6 text-center flex flex-col items-center gap-3">
                  <p className="text-sm text-amber-200">
                    Could not load repositories:{" "}
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white/30 hover:bg-white/10 text-slate-200 transition-colors mb-2"
                    onClick={handleManageRepos}
                  >
                    {provider === "github" ? (
                      <Github className="mr-2 h-4 w-4" />
                    ) : (
                      <Globe className="mr-2 h-4 w-4" />
                    )}
                    {provider === "github" ? "Check GitHub App Permissions" : "Select GitLab Projects"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-none"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : loading && !repos.length ? (
                <GridSkeleton />
              ) : (
                <>
                  <TabsContent value="my" className=" m-1 mt-1">
                    <RepoGrid repos={my} onPick={pick} provider={provider} handleManageRepos={handleManageRepos} />
                  </TabsContent>
                  <TabsContent value="co" className="m-0 mt-0">
                    <RepoGrid repos={co} onPick={pick} provider={provider} handleManageRepos={handleManageRepos} />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 2. วางหน้าต่าง GitlabManagerModal ไว้ตรงนี้! (นอก Dialog หลัก) */}
      <GitlabManagerModal
        open={isGitlabManagerOpen}
        onOpenChange={setIsGitlabManagerOpen}
        onSaved={refetch}
      />
    </>
  );
}

function RepoGrid({
  repos,
  onPick,
  provider,
  handleManageRepos,
}: {
  repos: Repo[];
  onPick: (r: Repo) => void;
  provider: string;
  handleManageRepos: () => void;
}) {

  // ถ้า Repo เป็น 0 ให้แสดงหน้าจอสวยๆ บังคับให้ไปตั้งค่า
  if (!repos.length)
    return (
      <div className="p-10 flex flex-col items-center justify-center h-64 text-center mt-10">
        <div className="bg-blue-500/20 p-5 rounded-full mb-6 border border-blue-500/30">
          {provider === "github" ? (
            <Github className="w-12 h-12 text-green-300" />
          ) : (
            <Gitlab className="w-12 h-12 text-orange-400" /> // ใช้ Globe สีส้มแทน GitLab (หรือถ้ามี Icon GitLab ก็ใช้ได้เลยครับ)
          )}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Connect Your Repositories</h3>
        <p className="text-sm text-slate-300 max-w-sm mb-8 leading-relaxed">
          You have successfully logged in! Now, please grant PipeGen access to the repositories you want to work with.
        </p>

        <Button
          size="lg"
          className="bg-[#3b82f6] hover:bg-[#2f6ad6] text-white shadow-lg shadow-blue-500/20 text-md px-6 py-6"
          onClick={handleManageRepos}
        >
          <LockKeyhole className="mr-3 h-5 w-5" />
          Select Repositories
        </Button>
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
          {(isGithub || pipelineCount > 0) && (
            <Badge icon={<GitPullRequest className="h-3 w-3 text-blue-300" />}>
              {pipelineCount} {pipelineCount !== 1 ? "pipelines" : "pipeline"}
            </Badge>
          )}

          {(isGithub || branchCount > 0) && (
            <Badge icon={<GitBranch className="h-3 w-3" />}>
              {branchCount}
            </Badge>
          )}

          {repo.stargazers_count > 0 && (
            <Badge icon={<Star className="h-3 w-3 text-yellow-400" />}>
              {repo.stargazers_count}
            </Badge>
          )}

          {tagCount > 0 && (
            <Badge icon={<Tag className="h-3 w-3" />}>{tagCount}</Badge>
          )}

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

function GitlabManagerModal({
  open,
  onOpenChange,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gitlab-all-repos"],
    queryFn: async () => {
      const res = await fetch("/api/gitlab/repos?all=true", { credentials: "include" });
      return res.json();
    },
    enabled: open,
  });

  React.useEffect(() => {
    if (data?.allowedIds) {
      setSelectedIds(new Set(data.allowedIds));
    }
  }, [data]);

  const toggleRepo = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async () => {
    if (!data?.repos) return;
    setIsSaving(true);

    const reposToSave = data.repos
      .filter((r: any) => selectedIds.has(String(r.id)))
      .map((r: any) => ({ id: r.id, full_name: r.full_name }));

    try {
      await fetch("/api/gitlab/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRepos: reposToSave }),
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-[700px] !h-[600px] flex flex-col bg-slate-900 text-white border-slate-700 p-6 ">

        <div className="shrink-0">
          <DialogTitle className="text-xl font-semibold">Select GitLab Projects</DialogTitle>
          <p className="text-sm text-slate-400 mt-2 mb-4">
            Choose which projects you want to make visible in PipeGen.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 border border-slate-700 rounded-lg p-3 bg-slate-950/50 shadow-inner no-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : data?.repos?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              No GitLab projects found.
            </div>
          ) : (
            data?.repos?.map((repo: any) => (
              <label
                key={repo.id}
                className="flex items-center space-x-3 p-3.5 rounded-md hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-700 transition-all"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  checked={selectedIds.has(String(repo.id))}
                  onChange={() => toggleRepo(String(repo.id))}
                />
                <span className="text-[15px] font-medium text-slate-200">{repo.full_name}</span>
              </label>
            ))
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <Button variant="ghost" className="hover:bg-slate-800 text-slate-300" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-500 text-white px-6"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save Selection"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}