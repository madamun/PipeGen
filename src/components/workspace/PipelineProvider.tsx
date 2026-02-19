// src/components/workspace/PipelineProvider.tsx

"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
// ✅ Import Types และ Engine เข้ามาใช้งาน
import { Repo, PipelineFile, PipelineContextType, ComponentCategory, ComponentValues } from "@/types/pipeline";
import { generateYamlFromValues, parseYamlToUI } from "@/lib/pipelineEngine";

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  // --- State ---
  const [repoProvider, setRepoProvider] = useState<"github" | "gitlab" | null>(null);
  const [syntaxProvider, setSyntaxProvider] = useState<"github" | "gitlab">("github");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [availableRepos, setAvailableRepos] = useState<Repo[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [originalContent, setOriginalContent] = useState("");
  const [fileList, setFileList] = useState<PipelineFile[]>([]);
  const [draftList, setDraftList] = useState<PipelineFile[]>([]);
  const [gitFileList, setGitFileList] = useState<PipelineFile[]>([]);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [componentValues, setComponentValues] = useState<ComponentValues>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isUpdatingFromUI = useRef(false);
  const isRenamingRef = useRef(false);
  const lastSavedContent = useRef<string | null>(null);
  const skipLoadOnce = useRef(false);

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      try {
        fetch('/api/components').then(res => res.json()).then(setCategories).catch(console.error);
        const res = await fetch('/api/auth/providers');
        const data = await res.json();
        const myProviders = data.providers || [];
        if (myProviders.includes('github')) { setRepoProvider('github'); setSyntaxProvider('github'); }
        else if (myProviders.includes('gitlab')) { setRepoProvider('gitlab'); setSyntaxProvider('gitlab'); }
      } catch (e) { console.error("Init failed", e); }
    };
    init();
  }, []);

  // --- Fetch Repos & Branches ---
  const fetchRepos = useCallback(async () => {
    if (!repoProvider) return;
    setIsLoading(true);
    try {
      const endpoint = repoProvider === 'gitlab' ? `/api/gitlab/repos` : `/api/github/repos`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setAvailableRepos(data.repos || []);
    } catch (error) { setAvailableRepos([]); } finally { setIsLoading(false); }
  }, [repoProvider]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const fetchBranches = useCallback(async (repoFullName: string) => {
    if (!repoFullName || !repoProvider) return;
    const endpoint = repoProvider === 'gitlab' ? `/api/gitlab/branches` : `/api/github/branches`;
    try {
      const res = await fetch(`${endpoint}?full_name=${encodeURIComponent(repoFullName)}`);
      const data = await res.json();
      setAvailableBranches(data.branches ? data.branches.map((b: { name: string }) => b.name) : []);
    } catch (error) { setAvailableBranches([]); }
  }, [repoProvider]);

  useEffect(() => {
    if (selectedRepo) {
      if (selectedRepo.default_branch) setSelectedBranch(selectedRepo.default_branch);
      fetchBranches(selectedRepo.full_name);
      if (selectedRepo.provider) setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
    }
  }, [selectedRepo, fetchBranches]);

  const getFullFilePath = (fileName: string) => selectedRepo?.provider === 'gitlab' ? fileName : `.github/workflows/${fileName}`;

  // --- Setup & Update Actions ---
  const setProvider = (newSyntax: "github" | "gitlab") => {
    setSyntaxProvider(newSyntax);
    isUpdatingFromUI.current = true;
    const nextValues = { ...componentValues };
    categories.forEach(cat => {
      cat.components.forEach((comp) => {
        comp.uiConfig?.fields?.forEach((field) => {
          if (field.platformDefaults?.[newSyntax]) nextValues[field.id] = field.platformDefaults[newSyntax];
        });
      });
    });
    setComponentValues(nextValues);
    setFileContent(generateYamlFromValues(categories, nextValues, newSyntax, fileContent));
  };

  const updateComponentValue = (id: string, value: string | number | boolean | string[] | undefined) => {
    const defaultBranch = selectedRepo?.default_branch || 'main';
    let finalValue = value;
    let nextValues = { ...componentValues };

    if (id === 'enable_push' && value === true && (!componentValues['push_branches']?.length)) nextValues['push_branches'] = [defaultBranch];
    if (id === 'enable_pr' && value === true && (!componentValues['pr_branches']?.length)) nextValues['pr_branches'] = [defaultBranch];
    if (id === 'push_branches' && componentValues['enable_push'] && Array.isArray(value) && value.length === 0) finalValue = [defaultBranch];
    if (id === 'pr_branches' && componentValues['enable_pr'] && Array.isArray(value) && value.length === 0) finalValue = [defaultBranch];

    nextValues[id] = finalValue;
    setComponentValues(nextValues);
    isUpdatingFromUI.current = true;
    setFileContent(generateYamlFromValues(categories, nextValues, syntaxProvider, fileContent));
  };

  // --- Parser Effect ---
  useEffect(() => {
    if (isUpdatingFromUI.current) { isUpdatingFromUI.current = false; return; }
    if (!fileContent.trim()) { setComponentValues({}); return; }

    const { detectedSyntax, newValues } = parseYamlToUI(fileContent, categories, syntaxProvider);
    if (detectedSyntax !== syntaxProvider) setSyntaxProvider(detectedSyntax as "github" | "gitlab");
    setComponentValues(prev => ({ ...prev, ...newValues }));
  }, [fileContent, categories]);

  // --- File Ops ---
  const refreshFileList = useCallback(async () => {
    if (!selectedRepo || !selectedBranch || !repoProvider) return;
    setIsLoading(true);
    try {
      await fetch('/api/pipeline/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, branch: selectedBranch, provider: repoProvider }) });
      const res = await fetch(`/api/pipeline/files?repoFullName=${selectedRepo.full_name}&branch=${selectedBranch}`);
      const data = await res.json();
      setDraftList(data.drafts || []);
      setGitFileList(data.gitFiles || []);
      setFileList([...(data.drafts || []), ...(data.gitFiles || [])]);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [selectedRepo, selectedBranch, repoProvider]);

  useEffect(() => { refreshFileList(); setSelectedFile(""); setComponentValues({}); }, [selectedRepo, selectedBranch, refreshFileList]);

  useEffect(() => {
    if (skipLoadOnce.current) { skipLoadOnce.current = false; return; }
    if (!selectedRepo || !selectedFile || !repoProvider) {
      if (!selectedFile) { setFileContent(""); setOriginalContent(""); }
      return;
    }
    if (isRenamingRef.current) { isRenamingRef.current = false; return; }

    const loadContent = async () => {
      try {
        const path = getFullFilePath(selectedFile);
        const params = new URLSearchParams({ repoFullName: selectedRepo.full_name, branch: selectedBranch, filePath: path });
        const resGit = await fetch(`/api/pipeline/read?${params.toString()}`);
        const dataGit = await resGit.json();
        setOriginalContent(dataGit.content || "");
        
        const resDraft = await fetch(`/api/pipeline/draft?${params.toString()}`);
        const dataDraft = await resDraft.json();

        if (dataDraft.content && !dataDraft.content.startsWith("# Error:")) {
          setFileContent(dataDraft.content);
          if (dataDraft.uiState) {
            setComponentValues(dataDraft.uiState);
            if (dataDraft.uiState.__syntax) setSyntaxProvider(dataDraft.uiState.__syntax);
          }
          lastSavedContent.current = dataDraft.content;
        } else {
          setFileContent(dataGit.content || "");
          setComponentValues({});
          if (selectedRepo.provider) setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
          lastSavedContent.current = dataGit.content || "";
        }
      } catch (e) { console.error(e); }
    };
    loadContent();
  }, [selectedRepo, selectedBranch, selectedFile]);

  const saveDraftToDB = useCallback(async (content: string) => {
    if (!selectedRepo || !selectedFile || content === lastSavedContent.current) return;
    try {
      setIsSaving(true);
      await fetch('/api/pipeline/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(selectedFile), content, uiState: { ...componentValues, __syntax: syntaxProvider }, branch: selectedBranch }) });
      lastSavedContent.current = content;
    } catch (e) { } finally { setIsSaving(false); }
  }, [selectedRepo, selectedBranch, selectedFile, componentValues, syntaxProvider]);

  useEffect(() => {
    if (!selectedRepo || !selectedFile) return;
    const timer = setTimeout(() => saveDraftToDB(fileContent), 2000);
    return () => clearTimeout(timer);
  }, [fileContent, selectedRepo, saveDraftToDB, selectedFile]);

  const renameCurrentFile = async (newName: string) => {
    if (!selectedRepo || !newName) return;
    isRenamingRef.current = true;
    setSelectedFile(newName);
    try { await saveDraftToDB(fileContent); await refreshFileList(); } catch (e) { isRenamingRef.current = false; }
  };

  const commitFile = async (message: string) => {
    if (!selectedRepo || !selectedFile || !repoProvider) return false;
    try {
      setIsSaving(true);
      const res = await fetch('/api/pipeline/commit', { method: 'POST', body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(selectedFile), content: fileContent, message, branch: selectedBranch, provider: repoProvider }) });
      if (res.ok) { await refreshFileList(); return true; }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
    return false;
  };

  const discardDraft = async () => {
    if (!selectedRepo || !selectedFile || !confirm(`Discard?`)) return false;
    try {
      setIsSaving(true);
      const res = await fetch('/api/pipeline/draft', { method: 'DELETE', body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(selectedFile), branch: selectedBranch }) });
      if (res.ok) { await refreshFileList(); setSelectedFile(""); return true; }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
    return false;
  };

  const autoSetup = async () => {
    if (!selectedRepo || !repoProvider) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/pipeline/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoFullName: selectedRepo.full_name, branch: selectedBranch, provider: repoProvider }) });
      const data = await res.json();
      if (data.config) {
        const targetFileName = repoProvider === 'gitlab' ? ".gitlab-ci.yml" : "main.yml";
        if (selectedFile !== targetFileName) { skipLoadOnce.current = true; setSelectedFile(targetFileName); }
        
        let newValues = { ...componentValues, ...data.config };
        categories.forEach(cat => cat.components.forEach((comp) => comp.uiConfig?.fields?.forEach((field) => {
          if (field.platformDefaults?.[repoProvider]) newValues[field.id] = field.platformDefaults[repoProvider];
        })));
        
        setComponentValues(newValues);
        isUpdatingFromUI.current = true;
        setFileContent(generateYamlFromValues(categories, newValues, syntaxProvider, ""));
        alert(`✅ Auto Setup Complete!\nDetected: ${data.config.use_node ? 'Node.js' : ''} ${data.config.docker_build ? 'Docker' : ''}`);
      }
    } catch (e) { alert("❌ Auto setup failed. Please configure manually."); } finally { setIsLoading(false); }
  };

  return (
    <PipelineContext.Provider value={{
      language: syntaxProvider, setLanguage: (lang: string) => setProvider(lang as "github" | "gitlab"), provider: syntaxProvider, setProvider, availableRepos, fetchRepos, selectedRepo, setSelectedRepo, selectedBranch, setSelectedBranch, fetchBranches, availableBranches, fileContent, setFileContent, selectedFile, setSelectedFile, fileList, draftList, gitFileList, originalContent, isSaving, isLoading, renameCurrentFile, commitFile, discardDraft, categories, componentValues, updateComponentValue, autoSetup
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) throw new Error("usePipeline must be used within a PipelineProvider");
  return context;
}