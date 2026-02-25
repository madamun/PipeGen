// src/components/workspace/PipelineProvider.tsx

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
  // --- State ---
  const [repoProvider, setRepoProvider] = useState<"github" | "gitlab" | null>(
    null,
  );
  const [syntaxProvider, setSyntaxProvider] = useState<"github" | "gitlab">(
    "github",
  );
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileList, setFileList] = useState<PipelineFile[]>([]);
  const [draftList, setDraftList] = useState<PipelineFile[]>([]);
  const [gitFileList, setGitFileList] = useState<PipelineFile[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [componentValues, setComponentValues] = useState<ComponentValues>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOther, setIsLoadingOther] = useState(false);

  // Left Panel open/close (for Suggestions "Go to Left Panel")
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState<
    Record<string, boolean>
  >({});
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(
    {},
  );

  const navigateToBlock = useCallback(
    (categoryId: string, componentName: string) => {
      setIsCollapsed(false);
      setCategoriesOpen((prev) => ({ ...prev, [categoryId]: true }));
      setSectionsOpen((prev) => ({
        ...prev,
        [componentName.toLowerCase()]: true,
      }));
    },
    [],
  );

  const isUpdatingFromUI = useRef(false);
  const isRenamingRef = useRef(false);
  const lastSavedContent = useRef<string | null>(null);
  const skipLoadOnce = useRef(false);

  // --- Init: components ---
  const { data: categoriesData } = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const res = await fetch("/api/components", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch components");
      return res.json() as Promise<ComponentCategory[]>;
    },
  });
  useEffect(() => {
    if (categoriesData) setCategories(categoriesData);
  }, [categoriesData]);

  // --- Auth providers ---
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
    if (authProvidersData.includes("github")) {
      setRepoProvider("github");
      setSyntaxProvider("github");
    } else if (authProvidersData.includes("gitlab")) {
      setRepoProvider("gitlab");
      setSyntaxProvider("gitlab");
    }
  }, [authProvidersData]);

  // --- Repos ---
  const {
    data: reposResponse,
    isLoading: isLoadingRepos,
    isError: isErrorRepos,
    error: errorRepos,
    refetch: refetchRepos,
  } = useQuery({
    queryKey: ["repos", repoProvider],
    queryFn: async () => {
      if (!repoProvider) return { repos: [] as Repo[] };
      const endpoint =
        repoProvider === "gitlab" ? `/api/gitlab/repos` : `/api/github/repos`;
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error ||
            (data as { detail?: string })?.detail ||
            "Failed to load repositories",
        );
      return { me: data.me, repos: (data.repos || []) as Repo[] };
    },
    enabled: !!repoProvider,
  });
  const availableRepos = reposResponse?.repos ?? [];
  const fetchRepos = useCallback(
    () => refetchRepos().then(() => undefined),
    [refetchRepos],
  );

  useEffect(() => {
    if (isErrorRepos && errorRepos)
      toast.error(errorRepos instanceof Error ? errorRepos.message : "Failed to load repositories");
  }, [isErrorRepos, errorRepos]);

  // --- Branches ---
  const {
    data: availableBranchesData = [],
    isLoading: isLoadingBranches,
    isError: isErrorBranches,
    error: errorBranches,
    refetch: refetchBranches,
  } = useQuery({
    queryKey: ["branches", selectedRepo?.full_name, repoProvider],
    queryFn: async () => {
      if (!selectedRepo?.full_name || !repoProvider) return [];
      const endpoint =
        repoProvider === "gitlab"
          ? `/api/gitlab/branches`
          : `/api/github/branches`;
      const res = await fetch(
        `${endpoint}?full_name=${encodeURIComponent(selectedRepo.full_name)}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error ||
            (data as { detail?: string })?.detail ||
            "Failed to load branches",
        );
      return (data.branches || []).map((b: { name: string }) => b.name) as string[];
    },
    enabled: !!selectedRepo?.full_name && !!repoProvider,
  });
  const availableBranches = availableBranchesData;
  useEffect(() => {
    if (isErrorBranches && errorBranches)
      toast.error(errorBranches instanceof Error ? errorBranches.message : "Failed to load branches");
  }, [isErrorBranches, errorBranches]);
  const fetchBranches = useCallback(
    (_repoFullName: string) => refetchBranches().then(() => undefined),
    [refetchBranches],
  );

  const isLoading =
    isLoadingRepos || isLoadingBranches || isLoadingOther;

  useEffect(() => {
    if (selectedRepo) {
      if (selectedRepo.default_branch)
        setSelectedBranch(selectedRepo.default_branch);
      if (selectedRepo.provider)
        setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
    }
  }, [selectedRepo]);

  const getFullFilePath = (fileName: string) => {
    if (!fileName) return "";
    
    if (selectedRepo?.provider === "gitlab") {
      // ถ้าเป็นไฟล์หลัก หรือมีโฟลเดอร์มาแล้ว ให้ใช้ชื่อนั้นเลย
      if (fileName === ".gitlab-ci.yml" || fileName.includes("/")) {
        return fileName;
      }
      // ถ้าเป็นชื่อไฟล์ลอยๆ ให้ยัดเข้า .gitlab/ci/ อัตโนมัติ (เหมือนตอน Commit)
      return `.gitlab/ci/${fileName}`;
    }
    // ฝั่ง GitHub
    return fileName.includes("/") ? fileName : `.github/workflows/${fileName}`;
  };

  // --- Setup & Update Actions ---
  const setProvider = (newSyntax: "github" | "gitlab") => {
    setSyntaxProvider(newSyntax);
    isUpdatingFromUI.current = true;
    const nextValues = { ...componentValues };
    categories.forEach((cat) => {
      cat.components.forEach((comp) => {
        comp.uiConfig?.fields?.forEach((field) => {
          if (field.platformDefaults?.[newSyntax])
            nextValues[field.id] = field.platformDefaults[newSyntax];
        });
      });
    });
    setComponentValues(nextValues);
    setFileContent(
      generateYamlFromValues(categories, nextValues, newSyntax, fileContent),
    );
  };

  const updateComponentValue = (
    id: string,
    value: string | number | boolean | string[] | undefined,
  ) => {
    const defaultBranch = selectedRepo?.default_branch || "main";
    let finalValue = value;
    let nextValues = { ...componentValues };

    const pushBranches = componentValues["push_branches"];
    const prBranches = componentValues["pr_branches"];
    if (
      id === "enable_push" &&
      value === true &&
      !(Array.isArray(pushBranches) && pushBranches.length > 0)
    )
      nextValues["push_branches"] = [defaultBranch];
    if (
      id === "enable_pr" &&
      value === true &&
      !(Array.isArray(prBranches) && prBranches.length > 0)
    )
      nextValues["pr_branches"] = [defaultBranch];
    if (
      id === "push_branches" &&
      componentValues["enable_push"] &&
      Array.isArray(value) &&
      value.length === 0
    )
      finalValue = [defaultBranch];
    if (
      id === "pr_branches" &&
      componentValues["enable_pr"] &&
      Array.isArray(value) &&
      value.length === 0
    )
      finalValue = [defaultBranch];

    nextValues[id] = finalValue;
    setComponentValues(nextValues);
    isUpdatingFromUI.current = true;
    setFileContent(
      generateYamlFromValues(
        categories,
        nextValues,
        syntaxProvider,
        fileContent,
      ),
    );
  };

  // --- Parser Effect ---
  useEffect(() => {
    if (isUpdatingFromUI.current) {
      isUpdatingFromUI.current = false;
      return;
    }
    if (!fileContent.trim()) {
      setComponentValues({});
      return;
    }

    const { detectedSyntax, newValues } = parseYamlToUI(
      fileContent,
      categories,
      syntaxProvider,
    );
    if (detectedSyntax !== syntaxProvider)
      setSyntaxProvider(detectedSyntax as "github" | "gitlab");
    setComponentValues((prev) => ({ ...prev, ...newValues }));
  }, [fileContent, categories]);

  // --- File Ops ---
  const refreshFileList = useCallback(async () => {
    if (!selectedRepo || !selectedBranch || !repoProvider) return;
    setIsLoadingOther(true);
    try {
      await fetch("/api/pipeline/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          branch: selectedBranch,
          provider: repoProvider,
        }),
      });
      const res = await fetch(
        `/api/pipeline/files?repoFullName=${selectedRepo.full_name}&branch=${selectedBranch}`,
        { credentials: "include" },
      );
      const data = await res.json();
      setDraftList(data.drafts || []);
      setGitFileList(data.gitFiles || []);
      setFileList([...(data.drafts || []), ...(data.gitFiles || [])]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOther(false);
    }
  }, [selectedRepo, selectedBranch, repoProvider]);

  useEffect(() => {
    refreshFileList();
    setSelectedFile("");
    setComponentValues({});
  }, [selectedRepo, selectedBranch, refreshFileList]);

  useEffect(() => {
    if (skipLoadOnce.current) {
      skipLoadOnce.current = false;
      return;
    }
    if (!selectedRepo || !selectedFile || !repoProvider) {
      if (!selectedFile) {
        setFileContent("");
        setOriginalContent("");
      }
      return;
    }
    if (isRenamingRef.current) {
      isRenamingRef.current = false;
      return;
    }

    const loadContent = async () => {
      try {
        const path = getFullFilePath(selectedFile);
        const params = new URLSearchParams({
          repoFullName: selectedRepo.full_name,
          branch: selectedBranch,
          filePath: path,
        });
        const resGit = await fetch(`/api/pipeline/read?${params.toString()}`, {
          credentials: "include",
        });
        const dataGit = await resGit.json();
        setOriginalContent(dataGit.content || "");

        const resDraft = await fetch(
          `/api/pipeline/draft?${params.toString()}`,
          { credentials: "include" },
        );
        const dataDraft = await resDraft.json();

        if (dataDraft.content && !dataDraft.content.startsWith("# Error:")) {
          setFileContent(dataDraft.content);
          if (dataDraft.uiState) {
            setComponentValues(dataDraft.uiState);
            if (dataDraft.uiState.__syntax)
              setSyntaxProvider(dataDraft.uiState.__syntax);
          }
          lastSavedContent.current = dataDraft.content;
        } else {
          setFileContent(dataGit.content || "");
          setComponentValues({});
          if (selectedRepo.provider)
            setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
          lastSavedContent.current = dataGit.content || "";
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadContent();
  }, [selectedRepo, selectedBranch, selectedFile]);

  const saveDraftToDB = useCallback(
    async (content: string) => {
      if (
        !selectedRepo ||
        !selectedFile ||
        content === lastSavedContent.current
      )
        return;
      try {
        setIsSaving(true);
        await fetch("/api/pipeline/draft", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoFullName: selectedRepo.full_name,
            filePath: getFullFilePath(selectedFile),
            content,
            uiState: { ...componentValues, __syntax: syntaxProvider },
            branch: selectedBranch,
          }),
        });
        lastSavedContent.current = content;
      } catch (e) {
      } finally {
        setIsSaving(false);
      }
    },
    [
      selectedRepo,
      selectedBranch,
      selectedFile,
      componentValues,
      syntaxProvider,
    ],
  );

  useEffect(() => {
    if (!selectedRepo || !selectedFile) return;
    const timer = setTimeout(() => saveDraftToDB(fileContent), 2000);
    return () => clearTimeout(timer);
  }, [fileContent, selectedRepo, saveDraftToDB, selectedFile]);

  const renameCurrentFile = async (newName: string) => {
    if (!selectedRepo || !newName) return;
    isRenamingRef.current = true;
    setSelectedFile(newName);
    try {
      await saveDraftToDB(fileContent);
      await refreshFileList();
    } catch (e) {
      isRenamingRef.current = false;
    }
  };

  const commitFile = async (message: string) => {
    if (!selectedRepo || !selectedFile || !repoProvider) return false;
    try {
      setIsSaving(true);
      const res = await fetch("/api/pipeline/commit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          filePath: getFullFilePath(selectedFile),
          content: fileContent,
          message,
          branch: selectedBranch,
          provider: repoProvider,
        }),
      });
      if (res.ok) {
        await refreshFileList();
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
    return false;
  };

  const discardDraft = async () => {
    if (!selectedRepo || !selectedFile || !confirm(`Discard?`)) return false;
    try {
      setIsSaving(true);
      const res = await fetch("/api/pipeline/draft", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          filePath: getFullFilePath(selectedFile),
          branch: selectedBranch,
        }),
      });
      if (res.ok) {
        await refreshFileList();
        setSelectedFile("");
        return true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
    return false;
  };

  const autoSetup = async () => {
    if (!selectedRepo || !repoProvider) return;
    setIsLoadingOther(true);
    try {
      const res = await fetch("/api/pipeline/analyze", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          branch: selectedBranch,
          provider: repoProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string })?.error || "Auto setup failed.");
        return;
      }
      if (data.config) {
        const targetFileName =
          repoProvider === "gitlab" ? ".gitlab-ci.yml" : "main.yml";
        if (selectedFile !== targetFileName) {
          skipLoadOnce.current = true;
          setSelectedFile(targetFileName);
        }

        let newValues = { ...componentValues, ...data.config };
        categories.forEach((cat) =>
          cat.components.forEach((comp) =>
            comp.uiConfig?.fields?.forEach((field) => {
              if (field.platformDefaults?.[repoProvider])
                newValues[field.id] = field.platformDefaults[repoProvider];
            }),
          ),
        );

        setComponentValues(newValues);
        isUpdatingFromUI.current = true;
        setFileContent(
          generateYamlFromValues(categories, newValues, syntaxProvider, ""),
        );
        const detected: string[] = [];
        if (data.config.use_node) detected.push("Node.js");
        if (data.config.use_python) detected.push("Python");
        if (data.config.use_go) detected.push("Go");
        if (data.config.use_rust) detected.push("Rust");
        if (data.config.docker_build) detected.push("Docker");
        toast.success(
          detected.length
            ? `Auto Setup complete. Detected: ${detected.join(", ")}`
            : "Auto Setup complete.",
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Auto setup failed. Please configure manually.",
      );
    } finally {
      setIsLoadingOther(false);
    }
  };

  return (
    <PipelineContext.Provider
      value={{
        language: syntaxProvider,
        setLanguage: (lang: string) => setProvider(lang as "github" | "gitlab"),
        provider: syntaxProvider,
        setProvider,
        availableRepos,
        fetchRepos,
        selectedRepo,
        setSelectedRepo,
        selectedBranch,
        setSelectedBranch,
        fetchBranches,
        availableBranches,
        fileContent,
        setFileContent,
        selectedFile,
        setSelectedFile,
        fileList,
        draftList,
        gitFileList,
        originalContent,
        isSaving,
        isLoading,
        renameCurrentFile,
        commitFile,
        discardDraft,
        categories,
        componentValues,
        updateComponentValue,
        autoSetup,
        isCollapsed,
        setIsCollapsed,
        categoriesOpen,
        setCategoriesOpen,
        sectionsOpen,
        setSectionsOpen,
        navigateToBlock,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context)
    throw new Error("usePipeline must be used within a PipelineProvider");
  return context;
}
