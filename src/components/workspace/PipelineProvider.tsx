"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import yaml from 'js-yaml';

export interface Repo {
  id: number | string;
  name: string;
  full_name: string;
  default_branch?: string;
  provider?: string;
}

interface PipelineContextType {
  language: string;
  setLanguage: (lang: string) => void;
  provider: "github" | "gitlab";
  setProvider: (p: "github" | "gitlab") => void;
  availableRepos: any[];
  fetchRepos: () => Promise<void>;
  selectedRepo: Repo | null;
  setSelectedRepo: (repo: Repo | null) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  fetchBranches: (repoFullName: string) => Promise<void>;
  availableBranches: string[];

  fileContent: string;
  setFileContent: (content: string) => void;
  selectedFile: string;
  setSelectedFile: (file: string) => void;

  originalContent: string;

  fileList: { fileName: string; fullPath: string }[];
  draftList: { fileName: string; fullPath: string }[];
  gitFileList: { fileName: string; fullPath: string }[];
  isSaving: boolean;
  isLoading: boolean;
  renameCurrentFile: (newName: string) => void;
  commitFile: (message: string) => Promise<boolean>;
  discardDraft: () => Promise<boolean>;
  categories: any[];
  componentValues: Record<string, any>;
  updateComponentValue: (id: string, val: any) => void;

  autoSetup: () => Promise<void>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  // --- State ---
  const [repoProvider, setRepoProvider] = useState<"github" | "gitlab" | null>(null);
  const [syntaxProvider, setSyntaxProvider] = useState<"github" | "gitlab">("github");

  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<string>("");

  const [originalContent, setOriginalContent] = useState("");

  const [fileList, setFileList] = useState<{ fileName: string; fullPath: string }[]>([]);
  const [draftList, setDraftList] = useState<{ fileName: string; fullPath: string }[]>([]);
  const [gitFileList, setGitFileList] = useState<{ fileName: string; fullPath: string }[]>([]);

  const [categories, setCategories] = useState<any[]>([]);
  const [componentValues, setComponentValues] = useState<Record<string, any>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isUpdatingFromUI = useRef(false);
  const isRenamingRef = useRef(false);
  const lastSavedContent = useRef<string | null>(null);

  // 🔥 ใช้ป้องกัน Race Condition เวลา Auto Setup
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

  // --- Fetch Repos ---
  const fetchRepos = useCallback(async () => {
    if (!repoProvider) return;
    setIsLoading(true);
    try {
      const endpoint = repoProvider === 'gitlab' ? `/api/gitlab/repos` : `/api/github/repos`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Fetch Repos Error: ${res.status}`);
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
      setAvailableBranches(data.branches ? data.branches.map((b: any) => b.name) : []);
    } catch (error) { setAvailableBranches([]); }
  }, [repoProvider]);

  useEffect(() => {
    if (selectedRepo) {
      if (selectedRepo.default_branch) setSelectedBranch(selectedRepo.default_branch);
      fetchBranches(selectedRepo.full_name);
      if (selectedRepo.provider) setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
    }
  }, [selectedRepo]);

  // =========================================================
  // 4. SYNTAX SWITCHING
  // =========================================================
  const setProvider = (newSyntax: "github" | "gitlab") => {
    setSyntaxProvider(newSyntax);
    isUpdatingFromUI.current = true;
    let newYaml = generateYamlFromValues(componentValues, newSyntax, fileContent);
    setFileContent(newYaml);
  };

  const getFullFilePath = (fileName: string) => {
    if (selectedRepo?.provider === 'gitlab') return fileName;
    return `.github/workflows/${fileName}`;
  };

  // =========================================================
  // 5. GENERATOR ENGINE
  // =========================================================
  const generateYamlFromValues = (values: Record<string, any>, targetSyntax: string, currentYaml: string) => {
    if (!categories || categories.length === 0) return currentYaml;

    const allContext: Record<string, any> = {};

    categories.forEach(cat => {
      cat.components.forEach((comp: any) => {
        comp.uiConfig?.fields?.forEach((field: any) => {
          if (field.defaultValue !== undefined) {
            allContext[field.id] = field.defaultValue;
          }
        });
      });
    });

    Object.assign(allContext, values);

    // 2. Base Structure
    const pipelineName = allContext['pipeline_name'] || "My-Pipeline";
    const runnerOS = allContext['runner_os'] || "ubuntu-latest";
    const checkoutVer = allContext['checkout_ver'] || "v4";

    let baseYaml = "";

    if (targetSyntax === 'github') {
      baseYaml = `name: ${pipelineName}
on:
{{TRIGGER_BLOCK}}
jobs:
  build-and-deploy:
    runs-on: ${runnerOS}
    steps:
      - name: Checkout Code
        uses: actions/checkout@${checkoutVer}`;
    } else {
      baseYaml = `# Pipeline: ${pipelineName}
workflow:
  rules:
{{TRIGGER_BLOCK}}
stages:
  - setup
  - test
  - build
  - deploy
`;
    }

    // 3. Trigger Block
    let triggerBlock = "";
    if (targetSyntax === 'github') {
      if (allContext['enable_push']) {
        const branches = allContext['push_branches'] || ['main'];
        triggerBlock += `  push:\n    branches: ${JSON.stringify(branches)}\n`;
      }
      if (allContext['enable_pr']) {
        const branches = allContext['pr_branches'] || ['main'];
        triggerBlock += `  pull_request:\n    branches: ${JSON.stringify(branches)}\n`;
      }
      if (!triggerBlock) triggerBlock = "  workflow_dispatch:";
    } else {
      if (allContext['enable_push']) {
        const branches = allContext['push_branches'] || ['main'];
        branches.forEach((b: string) => triggerBlock += `    - if: $CI_COMMIT_BRANCH == "${b}"\n`);
      }
      if (allContext['enable_pr']) {
        const branches = allContext['pr_branches'] || ['main'];
        branches.forEach((b: string) => triggerBlock += `    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "${b}"\n`);
      }
      if (!triggerBlock) triggerBlock = "    - when: manual";
    }

    baseYaml = baseYaml.replace("{{TRIGGER_BLOCK}}", triggerBlock);

    // 4. Components Loop
    let stepsCode = "";
    let jobsCode = "";

    categories.forEach(cat => {
      cat.components.forEach((comp: any) => {
        if (comp.name.includes("Trigger") || comp.name.includes("Project Info") || comp.name.includes("General Settings") || comp.name.includes("System & Runner")) return;

        let isActive = false;
        if (comp.type === 'group') {
          const mainSwitch = comp.uiConfig.fields.find((f: any) => f.type === 'switch');
          if (mainSwitch) {
            isActive = allContext[mainSwitch.id] === true;
          } else {
            isActive = true;
          }
        } else {
          isActive = allContext[comp.id] === true;
        }

        if (isActive && comp.syntaxes) {
          const syntax = comp.syntaxes.find((s: any) => s.platform === targetSyntax);
          if (syntax && syntax.template) {
            let template = syntax.template;
            template = template.replace(/{{([^}]+)}}/g, (match, variableName) => {
              const val = allContext[variableName];
              return val !== undefined ? val : match;
            });

            if (targetSyntax === 'github') {
              stepsCode += "\n" + template;
            } else {
              jobsCode += "\n" + template;
            }
          }
        }
      });
    });

    if (targetSyntax === 'github') {
      return baseYaml + stepsCode;
    } else {
      return baseYaml + jobsCode;
    }
  };

  // =========================================================
  // ACTION: UI Update
  // =========================================================
  const updateComponentValue = (id: string, value: any) => {
    const defaultBranch = selectedRepo?.default_branch || 'main';
    let finalValue = value;
    let nextValues = { ...componentValues };

    if (id === 'enable_push' && value === true) {
      if (!componentValues['push_branches'] || componentValues['push_branches'].length === 0) nextValues['push_branches'] = [defaultBranch];
    }
    if (id === 'enable_pr' && value === true) {
      if (!componentValues['pr_branches'] || componentValues['pr_branches'].length === 0) nextValues['pr_branches'] = [defaultBranch];
    }
    if (id === 'push_branches' && componentValues['enable_push'] === true && Array.isArray(value) && value.length === 0) finalValue = [defaultBranch];
    if (id === 'pr_branches' && componentValues['enable_pr'] === true && Array.isArray(value) && value.length === 0) finalValue = [defaultBranch];

    nextValues[id] = finalValue;
    setComponentValues(nextValues);

    isUpdatingFromUI.current = true;
    const newYaml = generateYamlFromValues(nextValues, syntaxProvider, fileContent);
    setFileContent(newYaml);
  };

  // =========================================================
  // PARSER (Code -> UI)
  // =========================================================
  useEffect(() => {
    if (isUpdatingFromUI.current) { isUpdatingFromUI.current = false; return; }

    if (!fileContent || !fileContent.trim()) {
      setComponentValues({});
      return;
    }

    try {
      const doc: any = yaml.load(fileContent);
      if (!doc || typeof doc !== 'object') return;

      let detected = syntaxProvider;
      if (doc.workflow || doc.stages || (doc.include && !doc.on)) detected = 'gitlab';
      else if (doc.on) detected = 'github';

      if (detected !== syntaxProvider) setSyntaxProvider(detected);

      const newValues: Record<string, any> = {};

      categories.forEach(cat => {
        cat.components.forEach((comp: any) => {
          const syntax = comp.syntaxes?.find((s: any) => s.platform === detected);

          if (syntax && syntax.template) {
            const template = syntax.template;
            const lines = template.split('\n');
            const signatureLine = lines.find((l: string) =>
              l.trim().length > 5 && !l.includes('{{') && !l.includes('}}')
            );

            let isDetected = false;
            if (signatureLine && fileContent.includes(signatureLine.trim())) {
              isDetected = true;
            }
            else if (comp.name.includes("Project Info") && doc.name) {
              isDetected = true;
            }

            if (isDetected) {
              const mainSwitch = comp.uiConfig.fields.find((f: any) => f.type === 'switch');
              if (mainSwitch) {
                newValues[mainSwitch.id] = true;
              }

              comp.uiConfig.fields.forEach((field: any) => {
                if (field.type === 'switch') return;
                const templateLine = lines.find((l: string) => l.includes(`{{${field.id}}}`));
                if (templateLine) {
                  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const parts = templateLine.split(`{{${field.id}}}`);
                  if (parts.length === 2) {
                    const prefix = escapeRegExp(parts[0].trim());
                    const suffix = escapeRegExp(parts[1].trim());
                    const regex = new RegExp(`${prefix}(.*?)${suffix}`);
                    const match = fileContent.match(regex);
                    if (match && match[1]) {
                      let extractedValue = match[1].trim();
                      extractedValue = extractedValue.replace(/^['"]|['"]$/g, '');
                      newValues[field.id] = extractedValue;
                    }
                  }
                }
                if (field.id === 'pipeline_name' && doc.name) {
                  newValues['pipeline_name'] = doc.name;
                }
              });
            }
          }
        });
      });

      if (detected === 'github') {
        if (doc.on?.push?.branches) { newValues['enable_push'] = true; newValues['push_branches'] = doc.on.push.branches; }
        if (doc.on?.pull_request?.branches) { newValues['enable_pr'] = true; newValues['pr_branches'] = doc.on.pull_request.branches; }
      }

      setComponentValues(prev => ({ ...prev, ...newValues }));
    } catch (e) { }
  }, [fileContent, categories]);

  // =========================================================
  // FILE OPS
  // =========================================================
  const refreshFileList = useCallback(async () => {
    if (!selectedRepo || !selectedBranch || !repoProvider) return;
    setIsLoading(true);
    try {
      await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo.full_name, branch: selectedBranch, provider: repoProvider })
      });
      const res = await fetch(`/api/pipeline/files?repoFullName=${selectedRepo.full_name}&branch=${selectedBranch}`);
      const data = await res.json();
      setDraftList(data.drafts || []);
      setGitFileList(data.gitFiles || []);
      setFileList([...(data.drafts || []), ...(data.gitFiles || [])]);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [selectedRepo, selectedBranch, repoProvider]);

  useEffect(() => { refreshFileList(); setSelectedFile(""); setComponentValues({}); }, [selectedRepo, selectedBranch]);

  // =========================================================
  // 📂 LOAD CONTENT (เพิ่ม Skip Logic แล้ว 🔥)
  // =========================================================
  useEffect(() => {
    // 🛑 1. ถ้ามีธง Skip -> รีเซ็ตธงแล้วจบเลย (ห้ามโหลดของเก่ามาทับ)
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
    if (isRenamingRef.current) { isRenamingRef.current = false; return; }
    
    const loadContent = async () => {
      try {
        const path = getFullFilePath(selectedFile);
        const params = new URLSearchParams({
          repoFullName: selectedRepo.full_name,
          branch: selectedBranch,
          filePath: path
        });
        const resGit = await fetch(`/api/pipeline/read?${params.toString()}`);
        const dataGit = await resGit.json();
        const gitRaw = dataGit.content || "";
        setOriginalContent(gitRaw);
        const resDraft = await fetch(`/api/pipeline/draft?${params.toString()}`);
        const dataDraft = await resDraft.json();
        
        if (dataDraft.content && !dataDraft.content.startsWith("# Error:")) {
          setFileContent(dataDraft.content);
          if (dataDraft.uiState) {
            setComponentValues(dataDraft.uiState);
            if (dataDraft.uiState.__syntax) {
              setSyntaxProvider(dataDraft.uiState.__syntax as "github" | "gitlab");
            }
          }
          lastSavedContent.current = dataDraft.content;
        } else {
          setFileContent(gitRaw);
          setComponentValues({});
          if (selectedRepo.provider) {
            setSyntaxProvider(selectedRepo.provider as "github" | "gitlab");
          }
          lastSavedContent.current = gitRaw;
        }
      } catch (e) { console.error(e); }
    };
    loadContent();
  }, [selectedRepo, selectedBranch, selectedFile]);

  // Auto Save
  const saveDraftToDB = useCallback(async (content: string) => {
    if (!selectedRepo || !selectedFile || content === lastSavedContent.current) return;
    try {
      setIsSaving(true);
      const stateToSave = { ...componentValues, __syntax: syntaxProvider };
      await fetch('/api/pipeline/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(selectedFile), content, uiState: stateToSave, branch: selectedBranch })
      });
      lastSavedContent.current = content;
    } catch (e) { } finally { setIsSaving(false); }
  }, [selectedRepo, selectedBranch, selectedFile, componentValues, repoProvider, syntaxProvider]);

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
    if (!selectedRepo || !selectedFile) return false;
    if (!confirm(`Discard?`)) return false;
    try {
      setIsSaving(true);
      const res = await fetch('/api/pipeline/draft', { method: 'DELETE', body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: getFullFilePath(selectedFile), branch: selectedBranch }) });
      if (res.ok) { await refreshFileList(); setSelectedFile(""); return true; }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
    return false;
  };

  // =========================================================
  // 🚀 AUTO SETUP (แก้ชื่อไฟล์ + กัน Race Condition แล้ว 🔥)
  // =========================================================
  const autoSetup = async () => {
    if (!selectedRepo || !repoProvider) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/pipeline/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          branch: selectedBranch,
          provider: repoProvider
        })
      });

      const data = await res.json();

      if (data.config) {
        // 1. ตั้งชื่อไฟล์
        let targetFileName = "";
        if (repoProvider === 'gitlab') {
          targetFileName = ".gitlab-ci.yml";
        } else {
          targetFileName = "main.yml";
        }

        // 2. 🔥 บอก useEffect ว่า "อย่าโหลดของเก่ามาทับนะ"
        if (selectedFile !== targetFileName) {
            skipLoadOnce.current = true; 
            setSelectedFile(targetFileName);
        }

        // 3. Update UI & Code
        const newValues = { ...componentValues, ...data.config };
        setComponentValues(newValues);

        isUpdatingFromUI.current = true;
        const newYaml = generateYamlFromValues(newValues, syntaxProvider, fileContent);
        setFileContent(newYaml);

        alert(`✅ Auto Setup Complete!\nDetected: ${data.config.use_node ? 'Node.js' : ''} ${data.config.docker_build ? 'Docker' : ''}`);
      }
    } catch (e) {
      console.error("Auto Setup Failed", e);
      alert("❌ Auto setup failed. Please configure manually.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PipelineContext.Provider value={{
      language: syntaxProvider, setLanguage: (lang: string) => setProvider(lang as "github" | "gitlab"),
      provider: syntaxProvider, setProvider,
      availableRepos, fetchRepos, selectedRepo, setSelectedRepo, selectedBranch, setSelectedBranch, fetchBranches, availableBranches,
      fileContent, setFileContent, selectedFile, setSelectedFile, fileList, draftList, gitFileList,
      originalContent,
      isSaving, isLoading, renameCurrentFile, commitFile, discardDraft, categories, componentValues, updateComponentValue, autoSetup
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