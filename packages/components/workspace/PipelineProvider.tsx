// packages/components/workspace/PipelineProvider.tsx

"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  Repo,
  PipelineFile,
  PipelineContextType,
  ComponentCategory,
  ComponentValues,
} from "../../types/pipeline";
import {
  generateYamlFromValues,
  parseYamlToUI,
} from "../../lib/pipelineEngine";
import { toast } from "sonner";

const PipelineContext = createContext<PipelineContextType | undefined>(
  undefined,
);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [repoProvider, setRepoProvider] = useState<"github" | "gitlab" | null>(null);
  const [syntaxProvider, setSyntaxProvider] = useState<"github" | "gitlab">("github");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");

  useEffect(() => {
    if (selectedRepo) {
      localStorage.setItem("pipegen_last_repo", JSON.stringify(selectedRepo));
    } else {
      localStorage.removeItem("pipegen_last_repo");
    }
  }, [selectedRepo]);

  useEffect(() => {
    const savedRepo = localStorage.getItem("pipegen_last_repo");
    if (savedRepo) {
      try {
        setSelectedRepo(JSON.parse(savedRepo));
      } catch (e) {
        console.error("Failed to parse saved repo", e);
      }
    }
    const savedBranch = localStorage.getItem("pipegen_last_branch");
    if (savedBranch) {
      setSelectedBranch(savedBranch);
    }
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      localStorage.setItem("pipegen_last_branch", selectedBranch);
    }
  }, [selectedBranch]);

  const [fileContent, setFileContent] = useState("");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  const [originalContent, setOriginalContent] = useState("");
  const [fileList, setFileList] = useState<PipelineFile[]>([]);
  const [draftList, setDraftList] = useState<PipelineFile[]>([]);
  const [gitFileList, setGitFileList] = useState<PipelineFile[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [componentValues, setComponentValues] = useState<ComponentValues>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOther, setIsLoadingOther] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const [forceReloadTrigger, setForceReloadTrigger] = useState(0);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState<Record<string, boolean>>({});
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});

  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("pipegen_dismissed_suggestions");
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("pipegen_dismissed_suggestions", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const resetDismissedSuggestions = useCallback(() => {
    setDismissedSuggestions(new Set());
    localStorage.removeItem("pipegen_dismissed_suggestions");
  }, []);

  const navigateToBlock = useCallback(
    (categoryId: string, componentName: string) => {
      setIsCollapsed(false);
      setCategoriesOpen((prev) => {
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach((k) => (next[k] = false));
        next[categoryId] = true;
        return next;
      });
      setSectionsOpen((prev) => ({
        ...prev,
        [componentName.toLowerCase()]: true,
      }));
      setScrollTarget(componentName.toLowerCase());
    },
    [],
  );

  const isUpdatingFromUI = useRef(false);
  const isRenamingRef = useRef(false);

  const componentValuesRef = useRef<ComponentValues>({});
  useEffect(() => { componentValuesRef.current = componentValues; }, [componentValues]);

  const syntaxProviderRef = useRef(syntaxProvider);
  useEffect(() => { syntaxProviderRef.current = syntaxProvider; }, [syntaxProvider]);

  const lastSavedContent = useRef<Record<string, string>>({});
  const activeFileContext = useRef<string>("");

  const prevRepoRef = useRef<string | undefined>(undefined);
  const prevBranchRef = useRef<string | undefined>(undefined);

  const isRollingBackRef = useRef(false);
  const rollbackCache = useRef<Record<string, string>>({});

  const getFullFilePath = useCallback((fileName: string) => {
    if (!fileName) return "";
    const existingFile = fileList.find((f) => f.fileName === fileName || f.fullPath === fileName);
    if (existingFile) return existingFile.fullPath;
    if (selectedRepo?.provider === "gitlab") {
      if (fileName === ".gitlab-ci.yml" || fileName.includes("/")) return fileName;
      return `.gitlab/ci/${fileName}`;
    }
    return fileName.includes("/") ? fileName : `.github/workflows/${fileName}`;
  }, [fileList, selectedRepo]);

  const saveDraftToDB = useCallback(
    async (content: string, tabToSave: string) => {
      if (!selectedRepo || !tabToSave) return;
      if (content === lastSavedContent.current[tabToSave]) return;
      try {
        setIsSaving(true);
        const path = getFullFilePath(tabToSave);
        await fetch("/api/pipeline/draft", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoFullName: selectedRepo.full_name,
            filePath: path,
            content,
            uiState: { ...componentValuesRef.current, __syntax: syntaxProviderRef.current },
            branch: selectedBranch,
          }),
        });
        lastSavedContent.current[tabToSave] = content;
        const shortName = path.split('/').pop() || path;
        setGitFileList((prev) => prev.filter((f) => f.fullPath !== path));
        setDraftList((prev) => {
          if (prev.some((f) => f.fullPath === path)) return prev;
          return [...prev, { fileName: shortName, fullPath: path, source: 'draft' }];
        });
        setFileList((prev) => {
          if (prev.some((f) => f.fullPath === path && f.source === 'draft')) return prev;
          const filtered = prev.filter((f) => f.fullPath !== path);
          return [...filtered, { fileName: shortName, fullPath: path, source: 'draft' }];
        });
      } catch (e) {
        console.error("Save Draft Error:", e);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedRepo, selectedBranch, getFullFilePath],
  );

  const handleSetActiveTab = useCallback((tabId: string) => {
    if (tabId === activeTab) return;
    if (activeTab && activeFileContext.current === activeTab && fileContent !== lastSavedContent.current[activeTab]) {
      saveDraftToDB(fileContent, activeTab);
    }
    activeFileContext.current = "";
    setFileContent("");
    setComponentValues({});
    setActiveTab(tabId);
  }, [activeTab, fileContent, saveDraftToDB]);

  const setSelectedFile = useCallback((fileName: string) => {
    if (!fileName) { handleSetActiveTab(""); return; }
    if (fileName === activeTab) return;
    if (activeTab && activeFileContext.current === activeTab && fileContent !== lastSavedContent.current[activeTab]) {
      saveDraftToDB(fileContent, activeTab);
    }
    activeFileContext.current = "";
    setFileContent("");
    setComponentValues({});
    setOpenTabs((prev) => {
      if (!prev.includes(fileName)) return [...prev, fileName];
      return prev;
    });
    setActiveTab(fileName);
  }, [activeTab, fileContent, saveDraftToDB, handleSetActiveTab]);

  const closeTab = useCallback((tabIdToClose: string) => {
    if (tabIdToClose === activeTab && activeFileContext.current === activeTab && fileContent !== lastSavedContent.current[activeTab]) {
      saveDraftToDB(fileContent, activeTab);
    }
    setOpenTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab !== tabIdToClose);
      if (activeTab === tabIdToClose) {
        const nextActive = newTabs.length > 0 ? newTabs[newTabs.length - 1] : "";
        activeFileContext.current = "";
        setFileContent("");
        setComponentValues({});
        setActiveTab(nextActive);
      }
      return newTabs;
    });
  }, [activeTab, fileContent, saveDraftToDB]);

  const { data: categoriesData } = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const res = await fetch("/api/components", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch components");
      return res.json() as Promise<ComponentCategory[]>;
    },
  });

  useEffect(() => { if (categoriesData) setCategories(categoriesData); }, [categoriesData]);

  const { data: authProvidersData } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: async () => {
      const res = await fetch("/api/auth/providers", { credentials: "include" });
      const data = await res.json();
      return (data.providers || []) as string[];
    },
  });

  useEffect(() => {
    if (!authProvidersData) return;
    if (authProvidersData.includes("github")) { setRepoProvider("github"); setSyntaxProvider("github"); }
    else if (authProvidersData.includes("gitlab")) { setRepoProvider("gitlab"); setSyntaxProvider("gitlab"); }
  }, [authProvidersData]);

  const { data: reposResponse, isLoading: isLoadingRepos, isError: isErrorRepos, error: errorRepos, refetch: refetchRepos } = useQuery({
    queryKey: ["repos", repoProvider],
    queryFn: async () => {
      if (!repoProvider) return { repos: [] as Repo[] };
      const endpoint = repoProvider === "gitlab" ? `/api/gitlab/repos` : `/api/github/repos`;
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as any)?.error || "Failed to load repositories");
      return { me: data.me, repos: (data.repos || []) as Repo[] };
    },
    enabled: !!repoProvider,
  });
  const availableRepos = reposResponse?.repos ?? [];
  const fetchRepos = useCallback(() => refetchRepos().then(() => undefined), [refetchRepos]);

  useEffect(() => {
    if (isErrorRepos && errorRepos) toast.error(errorRepos instanceof Error ? errorRepos.message : "Failed to load repositories");
  }, [isErrorRepos, errorRepos]);

  const { data: availableBranchesData = [], isLoading: isLoadingBranches, isError: isErrorBranches, error: errorBranches, refetch: refetchBranches } = useQuery({
    queryKey: ["branches", selectedRepo?.full_name, repoProvider],
    queryFn: async () => {
      if (!selectedRepo?.full_name || !repoProvider) return [];
      const endpoint = repoProvider === "gitlab" ? `/api/gitlab/branches` : `/api/github/branches`;
      const res = await fetch(`${endpoint}?full_name=${encodeURIComponent(selectedRepo.full_name)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as any)?.error || "Failed to load branches");
      return (data.branches || []).map((b: { name: string }) => b.name) as string[];
    },
    enabled: !!selectedRepo?.full_name && !!repoProvider,
  });
  const availableBranches = availableBranchesData;
  useEffect(() => {
    if (isErrorBranches && errorBranches) toast.error(errorBranches instanceof Error ? errorBranches.message : "Failed to load branches");
  }, [isErrorBranches, errorBranches]);

  const fetchBranches = useCallback((_repoFullName: string) => refetchBranches().then(() => undefined), [refetchBranches]);
  const isLoading = isLoadingRepos || isLoadingBranches || isLoadingOther;

  useEffect(() => {
    if (typeof window === "undefined" || availableRepos.length === 0) return;
    const rYaml = sessionStorage.getItem("rollback_yaml");
    const rRepo = sessionStorage.getItem("rollback_repo");
    const rBranch = sessionStorage.getItem("rollback_branch");
    const rPath = sessionStorage.getItem("rollback_path");
    if (rYaml && rRepo && rPath) {
      const executeRollback = async () => {
        setIsRollingBack(true);
        isRollingBackRef.current = true;
        try {
          const targetRepo = availableRepos.find((r) => r.full_name === rRepo);
          if (!targetRepo) return;
          await fetch("/api/pipeline/draft", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: targetRepo.full_name, filePath: rPath, content: rYaml, uiState: { __syntax: targetRepo.provider || "github" }, branch: rBranch || "main" }) });
          rollbackCache.current[rPath] = rYaml;
          const isDifferentRepo = selectedRepo?.full_name !== targetRepo.full_name;
          setSelectedRepo(targetRepo);
          if (rBranch) setSelectedBranch(rBranch);
          if (targetRepo.provider) setSyntaxProvider(targetRepo.provider as "github" | "gitlab");
          if (isDifferentRepo) { setOpenTabs([rPath]); } else { setOpenTabs((prev) => prev.includes(rPath) ? prev : [...prev, rPath]); }
          setActiveTab(rPath);
          setForceReloadTrigger(Date.now());
        } catch (error) { console.error("Rollback failed:", error); } finally {
          sessionStorage.removeItem("rollback_yaml"); sessionStorage.removeItem("rollback_repo"); sessionStorage.removeItem("rollback_branch"); sessionStorage.removeItem("rollback_path");
          setTimeout(() => { setIsRollingBack(false); isRollingBackRef.current = false; }, 800);
        }
      };
      executeRollback();
    }
  }, [availableRepos, pathname]);

  const refreshFileList = useCallback(async () => {
    if (!selectedRepo || !selectedBranch || !repoProvider) return;
    setIsLoadingOther(true);
    try {
      const syncRes = await fetch("/api/pipeline/sync", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, branch: selectedBranch, provider: repoProvider }) });
      if (!syncRes.ok) { setDraftList([]); setGitFileList([]); setFileList([]); return; }
      const res = await fetch(`/api/pipeline/files?repoFullName=${selectedRepo.full_name}&branch=${selectedBranch}&t=${Date.now()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      setDraftList(data.drafts || []); setGitFileList(data.gitFiles || []); setFileList([...(data.drafts || []), ...(data.gitFiles || [])]);
    } catch (e) { console.error(e); } finally { setIsLoadingOther(false); }
  }, [selectedRepo, selectedBranch, repoProvider]);

  useEffect(() => { refreshFileList(); }, [selectedRepo, selectedBranch, refreshFileList]);

  useEffect(() => {
    const currentRepo = selectedRepo?.full_name;
    const currentBranch = selectedBranch;
    if (currentRepo !== prevRepoRef.current || currentBranch !== prevBranchRef.current) {
      const isFirstLoad = prevRepoRef.current === undefined;
      prevRepoRef.current = currentRepo; prevBranchRef.current = currentBranch;
      if (isRollingBackRef.current) return;
      if (!isFirstLoad) { setOpenTabs([]); setActiveTab(""); setComponentValues({}); }
    }
  }, [selectedRepo?.full_name, selectedBranch]);

  useEffect(() => {
    if (selectedRepo) {
      if (selectedRepo.provider) setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
      resetDismissedSuggestions();
    }
  }, [selectedRepo, resetDismissedSuggestions]);

  const setProvider = (newSyntax: "github" | "gitlab") => {
    if (newSyntax === syntaxProvider) return;
    setSyntaxProvider(newSyntax);
    isUpdatingFromUI.current = true;
    const nextValues = { ...componentValues };
    categories.forEach((cat) => { cat.components.forEach((comp) => { comp.uiConfig?.fields?.forEach((field) => { if (field.platformDefaults?.[newSyntax]) nextValues[field.id] = field.platformDefaults[newSyntax]; }); }); });
    setComponentValues(nextValues);
    setFileContent(generateYamlFromValues(categories, nextValues, newSyntax, ""));
  };

  // ===== applyMultipleValues: set หลาย field พร้อมกัน gen YAML ครั้งเดียว =====
  const applyMultipleValues = useCallback((config: Record<string, string | number | boolean | string[] | undefined>) => {
    let nextValues = { ...componentValues, ...config };
    Object.entries(config).forEach(([fieldId, finalValue]) => {
      if (finalValue !== undefined && finalValue !== null) {
        const lookupKey = String(finalValue);
        categories.forEach(cat =>
          cat.components.forEach((comp: any) => {
            const field = (comp.uiConfig?.fields || []).find((f: any) => f.id === fieldId);
            if (field?.linkedFields) {
              Object.entries(field.linkedFields).forEach(([targetId, mapping]: [string, any]) => {
                const newVal = mapping[lookupKey];
                if (newVal) nextValues[targetId] = newVal;
              });
            }
          })
        );
      }
    });
    setComponentValues(nextValues);
    isUpdatingFromUI.current = true;
    setFileContent(generateYamlFromValues(categories, nextValues, syntaxProvider, ""));
  }, [componentValues, categories, syntaxProvider]);

  // ===== updateComponentValue: set 1 field =====
  const updateComponentValue = (id: string, value: string | number | boolean | string[] | undefined) => {
    const defaultBranch = selectedRepo?.default_branch || "main";
    let finalValue = value;
    let nextValues = { ...componentValues };

    const pushBranches = componentValues["push_branches"];
    const prBranches = componentValues["pr_branches"];
    if (id === "enable_push" && value === true && !(Array.isArray(pushBranches) && pushBranches.length > 0))
      nextValues["push_branches"] = [defaultBranch];
    if (id === "enable_pr" && value === true && !(Array.isArray(prBranches) && prBranches.length > 0))
      nextValues["pr_branches"] = [defaultBranch];
    if (id === "push_branches" && componentValues["enable_push"] && Array.isArray(value) && value.length === 0)
      finalValue = [defaultBranch];
    if (id === "pr_branches" && componentValues["enable_pr"] && Array.isArray(value) && value.length === 0)
      finalValue = [defaultBranch];

    nextValues[id] = finalValue;
    if (finalValue !== undefined && finalValue !== null) {
      const lookupKey = String(finalValue);
      categories.forEach(cat =>
        cat.components.forEach((comp: any) => {
          const field = (comp.uiConfig?.fields || []).find((f: any) => f.id === id);
          if (field?.linkedFields) {
            Object.entries(field.linkedFields).forEach(([targetId, mapping]: [string, any]) => {
              const newVal = mapping[lookupKey];
              if (newVal) nextValues[targetId] = newVal;
            });
          }
        })
      );
    }
    setComponentValues(nextValues);
    isUpdatingFromUI.current = true;
    const shouldMerge = fileContent.trim() && !fileContent.startsWith('# Error');
    setFileContent(generateYamlFromValues(categories, nextValues, syntaxProvider, shouldMerge ? fileContent : ""));
  };

  useEffect(() => {
    if (isUpdatingFromUI.current) { isUpdatingFromUI.current = false; return; }
    if (!fileContent.trim()) { if (categories.length > 0) setComponentValues({}); return; }
    if (categories.length === 0) return;
    const parseTimer = setTimeout(() => {
      try {
        const { detectedSyntax, newValues } = parseYamlToUI(fileContent, categories, syntaxProvider);
        if (detectedSyntax !== syntaxProvider) setSyntaxProvider(detectedSyntax as "github" | "gitlab");
        setComponentValues(newValues);
      } catch (e) { /* silent */ }
    }, 500);
    return () => clearTimeout(parseTimer);
  }, [fileContent, categories, syntaxProvider]);

  useEffect(() => {
    let ignore = false;
    if (!selectedRepo?.full_name || !activeTab || !repoProvider) {
      if (!activeTab) { setFileContent(""); setOriginalContent(""); activeFileContext.current = ""; }
      return;
    }
    if (isRenamingRef.current) { isRenamingRef.current = false; return; }
    if (rollbackCache.current[activeTab]) {
      const rYaml = rollbackCache.current[activeTab]; delete rollbackCache.current[activeTab];
      activeFileContext.current = activeTab; setFileContent(rYaml); setComponentValues({}); lastSavedContent.current[activeTab] = rYaml; return;
    }
    if (activeFileContext.current !== activeTab) { activeFileContext.current = ""; setFileContent(""); setComponentValues({}); }

    const loadContent = async () => {
      let finalContent = "";
      try {
        const path = getFullFilePath(activeTab);
        const params = new URLSearchParams({ repoFullName: selectedRepo.full_name, branch: selectedBranch, filePath: path });
        const cacheBuster = `&t=${Date.now()}`;
        let dataGit = { content: "" };
        try { const resGit = await fetch(`/api/pipeline/read?${params.toString()}${cacheBuster}`, { credentials: "include", cache: "no-store" }); if (resGit.ok) dataGit = await resGit.json(); } catch (e) { }
        if (ignore) return;
        setOriginalContent(dataGit.content || "");
        let dataDraft = { content: "", uiState: null };
        try { const resDraft = await fetch(`/api/pipeline/draft?${params.toString()}${cacheBuster}`, { credentials: "include", cache: "no-store" }); if (resDraft.ok) dataDraft = await resDraft.json(); } catch (e) { }
        if (ignore) return;
        if (dataDraft.content && !dataDraft.content.startsWith("# Error:")) {
          finalContent = dataDraft.content;
          if (dataDraft.uiState) { setComponentValues(dataDraft.uiState); if (dataDraft.uiState.__syntax) setSyntaxProvider(dataDraft.uiState.__syntax); }
        } else {
          finalContent = dataGit.content || ""; setComponentValues({});
          if (selectedRepo.provider) setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
        }
      } catch (e) { console.error("Critical error in loadContent:", e); } finally {
        if (!ignore) { lastSavedContent.current[activeTab] = finalContent; activeFileContext.current = activeTab; setFileContent(finalContent); }
      }
    };
    loadContent();
    return () => { ignore = true; };
  }, [selectedRepo?.full_name, selectedBranch, activeTab, forceReloadTrigger]);

  useEffect(() => {
    if (!selectedRepo || !activeTab) return;
    if (activeFileContext.current !== activeTab) return;
    const timer = setTimeout(() => saveDraftToDB(fileContent, activeTab), 2000);
    return () => clearTimeout(timer);
  }, [fileContent, selectedRepo, saveDraftToDB, activeTab]);

  const renameCurrentFile = async (newName: string) => {
    if (!selectedRepo || !newName || !activeTab) return;
    isRenamingRef.current = true;
    const oldFilePath = getFullFilePath(activeTab); const newFilePath = getFullFilePath(newName);
    setOpenTabs((prev) => prev.map(tab => tab === activeTab ? newFilePath : tab)); setActiveTab(newFilePath);
    const safeContent = activeFileContext.current === activeTab ? fileContent : "";
    lastSavedContent.current[newFilePath] = safeContent; activeFileContext.current = newFilePath;
    try {
      setIsSaving(true);
      await fetch("/api/pipeline/draft", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: newFilePath, content: safeContent, uiState: { ...componentValuesRef.current, __syntax: syntaxProviderRef.current }, branch: selectedBranch }) });
      if (oldFilePath !== newFilePath) { await fetch("/api/pipeline/draft", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: oldFilePath, branch: selectedBranch }) }); }
      await refreshFileList();
    } catch (e) { console.error("Rename failed:", e); } finally { isRenamingRef.current = false; setIsSaving(false); }
  };

  const commitFile = async (message: string) => {
    if (!selectedRepo || !activeTab || !repoProvider) return false;
    try {
      setIsSaving(true);
      const res = await fetch("/api/pipeline/commit", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(activeTab), content: fileContent, message, branch: selectedBranch, provider: repoProvider }) });
      if (res.ok) { await refreshFileList(); return true; }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
    return false;
  };

  const discardDraft = async () => {
    if (!selectedRepo || !activeTab || !confirm(`Discard draft for this file?`)) return false;
    try {
      setIsSaving(true); const tabToClose = activeTab;
      const res = await fetch("/api/pipeline/draft", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(tabToClose), branch: selectedBranch }) });
      if (res.ok) { activeFileContext.current = ""; setFileContent(""); delete lastSavedContent.current[tabToClose]; closeTab(tabToClose); refreshFileList(); return true; }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
    return false;
  };

    const autoSetup = async () => {
    if (!selectedRepo || !repoProvider) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/pipeline/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: selectedRepo.full_name, branch: selectedBranch, provider: repoProvider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error((data as { error?: string })?.error || "Auto setup failed."); return; }

      if (data.config) {
        const targetFileName = repoProvider === "gitlab" ? ".gitlab-ci.yml" : "main.yml";

        // รวม config + platformDefaults
        let configWithDefaults = { ...data.config };
        categories.forEach((cat) =>
          cat.components.forEach((comp) =>
            comp.uiConfig?.fields?.forEach((field) => {
              if (field.platformDefaults?.[repoProvider])
                configWithDefaults[field.id] = field.platformDefaults[repoProvider];
            }),
          ),
        );

        // ใช้ applyMultipleValues → resolve linkedFields + gen YAML ครั้งเดียว
        applyMultipleValues(configWithDefaults);

        // เปิด tab + save draft
        if (activeTab !== targetFileName) {
          setOpenTabs((prev) => prev.includes(targetFileName) ? prev : [...prev, targetFileName]);
          setActiveTab(targetFileName);
        }
        activeFileContext.current = targetFileName;

        // รอให้ state update แล้ว save
        setTimeout(async () => {
          const generated = generateYamlFromValues(categories, { ...componentValues, ...configWithDefaults }, syntaxProvider, "");
          lastSavedContent.current[targetFileName] = "";
          await saveDraftToDB(generated, targetFileName);
        }, 500);

        const detected: string[] = [];
        if (data.config.use_node) detected.push("Node.js");
        if (data.config.use_python) detected.push("Python");
        if (data.config.use_go) detected.push("Go");
        if (data.config.use_rust) detected.push("Rust");
        if (data.config.docker_build) detected.push("Docker");
        toast.success(detected.length ? `Auto Setup complete. Detected: ${detected.join(", ")}` : "Auto Setup complete.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto setup failed. Please configure manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PipelineContext.Provider
      value={{
        language: syntaxProvider,
        setLanguage: (lang: string) => setProvider(lang as "github" | "gitlab"),
        provider: syntaxProvider, setProvider,
        availableRepos, fetchRepos, selectedRepo, setSelectedRepo,
        selectedBranch, setSelectedBranch, fetchBranches, availableBranches,
        fileContent, setFileContent,
        openTabs, setOpenTabs, activeTab, setActiveTab: handleSetActiveTab, closeTab,
        selectedFile: activeTab, setSelectedFile,
        fileList, draftList, gitFileList, originalContent,
        isSaving, isLoading, isAnalyzing, isRollingBack,
        renameCurrentFile, commitFile, discardDraft,
        categories, componentValues, updateComponentValue, applyMultipleValues,
        autoSetup,
        isCollapsed, setIsCollapsed, categoriesOpen, setCategoriesOpen, sectionsOpen, setSectionsOpen,
        navigateToBlock, scrollTarget, setScrollTarget,
        dismissedSuggestions, dismissSuggestion, resetDismissedSuggestions,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) throw new Error("usePipeline must be used within a PipelineProvider");
  return context;
}