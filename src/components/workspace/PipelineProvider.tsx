"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import yaml from 'js-yaml';

export interface Repo {
  id: number | string;
  name: string;
  full_name: string;
  default_branch?: string;
}

interface PipelineContextType {
  language: string;
  setLanguage: (lang: string) => void;
  fileContent: string;
  setFileContent: (content: string) => void;
  selectedRepo: Repo | null;
  setSelectedRepo: (repo: Repo | null) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  isSaving: boolean;
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  fileList: { fileName: string; fullPath: string }[];
  draftList: { fileName: string; fullPath: string }[];
  gitFileList: { fileName: string; fullPath: string }[];
  renameCurrentFile: (newName: string) => void;
  commitFile: (message: string) => Promise<boolean>;
  discardDraft: () => Promise<boolean>;
  categories: any[];
  availableBranches: string[];
  componentValues: Record<string, any>;
  updateComponentValue: (id: string, val: any) => void;
  provider: "github" | "gitlab";
  setProvider: (p: "github" | "gitlab") => void;
  fetchBranches: (repoFullName: string) => Promise<void>;
  availableRepos: any[]; // เพิ่มตัวนี้
  fetchRepos: () => Promise<void>; // เพิ่มตัวนี้
  isLoading: boolean;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  // --- State ---
  const [language, setLanguage] = useState("github");
  const [fileContent, setFileContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [provider, setProvider] = useState<"github" | "gitlab">("github");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileList, setFileList] = useState<{ fileName: string; fullPath: string }[]>([]);
  const [draftList, setDraftList] = useState<{ fileName: string; fullPath: string }[]>([]);
  const [gitFileList, setGitFileList] = useState<{ fileName: string; fullPath: string }[]>([]);

  // --- UI State ---
  const [categories, setCategories] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [componentValues, setComponentValues] = useState<Record<string, any>>({});

  const isUpdatingFromUI = useRef(false);
  const isRenamingRef = useRef(false);
  const lastSavedContent = useRef<string | null>(null);
  const isAutoDetecting = useRef(false);

  const [availableRepos, setAvailableRepos] = useState<any[]>([]); // ✅ State เก็บรายชื่อ Repo
  const [isLoading, setIsLoading] = useState(false);

  // --- Load Initial Data ---
  useEffect(() => {
    fetch('/api/components').then(res => res.json()).then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      fetch(`/api/github/branches?full_name=${selectedRepo.full_name}`)
        .then(res => res.json())
        .then(data => {
          if (data.branches && Array.isArray(data.branches)) {
            setAvailableBranches(data.branches.map((b: any) => b.name));
          } else {
            setAvailableBranches([]);
          }
        })
        .catch(() => setAvailableBranches([]));
    }
  }, [selectedRepo]);

  useEffect(() => {
    const detectProvider = async () => {
      try {
        const res = await fetch('/api/auth/providers');
        const data = await res.json();
        const myProviders = data.providers || [];

        // Logic เลือกให้อัตโนมัติ:
        if (myProviders.includes('gitlab')) {
          // ถ้ามี GitLab (หรือมีทั้งคู่) ให้ลองใช้ GitLab ก่อน (หรือแล้วแต่ priority คุณ)
          // แต่ถ้า User login ด้วย GitLab อย่างเดียว มันจะเข้าเคสนี้แน่นอน
          setProvider('gitlab');
        }

        if (myProviders.includes('github') && !myProviders.includes('gitlab')) {
          // ถ้ามีแต่ GitHub
          setProvider('github');
        }

        // หมายเหตุ: ถ้ามีทั้งคู่ คุณอาจจะต้องเลือกตัวใดตัวหนึ่งเป็น default
        // code ด้านบน ถ้ามี gitlab จะเลือก gitlab เป็นหลัก
      } catch (e) {
        console.error("Auto-detect provider failed", e);
      }
    };

    detectProvider();
  }, []);

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    try {
      // เลือก API ตามค่าย
      const endpoint = provider === 'gitlab'
        ? `/api/gitlab/repos`
        : `/api/github/repos`; // หรือ /api/github/commit/repos แล้วแต่ route คุณ

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.repos) {
        setAvailableRepos(data.repos);
      } else {
        setAvailableRepos([]);
      }
    } catch (error) {
      console.error("Failed to fetch repos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [provider]); // ✅ รันใหม่เมื่อ provider เปลี่ยน

  // 👇 Effect: สั่งดึงข้อมูลทันทีที่เปลี่ยนค่าย
  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);


  const fetchBranches = useCallback(async (repoFullName: string) => {
    if (!repoFullName) return;

    // เลือก API ตาม Provider ปัจจุบัน
    const endpoint = provider === 'gitlab'
      ? `/api/gitlab/branches`
      : `/api/github/branches`;

    try {
      const res = await fetch(`${endpoint}?full_name=${encodeURIComponent(repoFullName)}`);
      const data = await res.json();

      if (data.branches) {
        // Map เอาแค่ชื่อ Branch มาเก็บ
        setAvailableBranches(data.branches.map((b: any) => b.name));
      } else {
        setAvailableBranches([]);
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      setAvailableBranches([]);
    }
  }, [provider]); // เมื่อ provider เปลี่ยน ฟังก์ชันจะอัปเดต URL ใหม่

  // =========================================================
  // 🧠 CORE ENGINE: สร้าง YAML (แบบไม่ลบโค้ดที่ user พิมพ์เพิ่ม)
  // =========================================================
  const generateYamlFromValues = (values: Record<string, any>, lang: string, currentYaml: string) => {
    let doc: any = {};

    try {
      // 🔥 FIX 1: พยายามโหลดโค้ดปัจจุบันก่อน
      doc = yaml.load(currentYaml);

      // ถ้าโหลดแล้วเป็น null (ไฟล์ว่าง) หรือไม่ใช่ object ให้เริ่มใหม่
      if (!doc || typeof doc !== 'object') {
        doc = {};
      }
    } catch (e) {
      // 🔥 FIX 2: จุดสำคัญที่สุด! 
      // ถ้า User พิมพ์โค้ดค้างไว้ (Syntax Error) แล้วไปกดปุ่ม UI
      // ห้าม Gen ทับเด็ดขาด! ให้คืนค่าเดิมกลับไป เพื่อรักษาโค้ด User ไว้
      console.warn("YAML Syntax Error: Skipping UI update to prevent data loss.");
      return currentYaml;
    }

    // หา Default Branch
    const defaultBranch = selectedRepo?.default_branch || 'main';

    // ------------------------------------------------
    // 🟢 GITHUB LOGIC
    // ------------------------------------------------
    if (lang === 'github') {
      // ลบส่วนที่เป็นของ GitLab ทิ้ง (แต่เก็บ jobs, env, steps ไว้)
      delete doc.workflow;
      delete doc.stages;
      // (อย่าเผลอไปลบ doc.jobs นะครับ!)

      if (!doc.on) doc.on = {};

      // --- Push ---
      const pushEnabled = values['enable_push'];
      let pushBranches = values['push_branches'];

      if (pushEnabled) {
        if (!doc.on.push) doc.on.push = {};
        doc.on.push.branches = (pushBranches && pushBranches.length > 0) ? pushBranches : [defaultBranch];
      } else {
        delete doc.on.push;
      }

      // --- Pull Request ---
      const prEnabled = values['enable_pr'];
      let prBranches = values['pr_branches'];

      if (prEnabled) {
        if (!doc.on.pull_request) doc.on.pull_request = {};
        doc.on.pull_request.branches = (prBranches && prBranches.length > 0) ? prBranches : [defaultBranch];
      } else {
        delete doc.on.pull_request;
      }

      if (Object.keys(doc.on).length === 0) delete doc.on;
    }

    // ------------------------------------------------
    // 🔴 GITLAB LOGIC
    // ------------------------------------------------
    else if (lang === 'gitlab') {
      // ลบส่วนที่เป็นของ GitHub ทิ้ง
      delete doc.on;
      delete doc.name;

      const rules: any[] = [];

      // --- Push ---
      if (values['enable_push']) {
        let branches = values['push_branches'];
        if (!branches || branches.length === 0) branches = [defaultBranch];

        branches.forEach((b: string) => {
          rules.push({ if: `$CI_COMMIT_BRANCH == "${b}"` });
        });
      }

      // --- Pull Request ---
      if (values['enable_pr']) {
        let branches = values['pr_branches'];
        if (!branches || branches.length === 0) branches = [defaultBranch];

        branches.forEach((b: string) => {
          rules.push({ if: `$CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "${b}"` });
        });
      }

      if (rules.length > 0) {
        if (!doc.workflow) doc.workflow = {};
        doc.workflow.rules = rules;
      } else {
        delete doc.workflow;
      }
    }

    // Convert Object -> YAML  
    try {
      return yaml.dump(doc, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        // เคล็ดลับ: sortKeys: true บางทีช่วยให้โค้ดเป็นระเบียบ แต่ถ้า User ไม่ชอบให้ปิดไว้
      });
    } catch (e) {
      return currentYaml;
    }
  };

  // =========================================================
  // 🔄 ACTION: UI -> Code
  // =========================================================
  const updateComponentValue = (id: string, value: any) => {
    const defaultBranch = selectedRepo?.default_branch || 'main';
    let finalValue = value;

    if ((id === 'push_branches' || id === 'pr_branches') && Array.isArray(value) && value.length === 0) {
      finalValue = [defaultBranch];
    }

    let newValues = { ...componentValues, [id]: finalValue };

    if (id === 'enable_push' && value === true) {
      if (!newValues['push_branches'] || newValues['push_branches'].length === 0) newValues['push_branches'] = [defaultBranch];
    }
    if (id === 'enable_pr' && value === true) {
      if (!newValues['pr_branches'] || newValues['pr_branches'].length === 0) newValues['pr_branches'] = [defaultBranch];
    }

    setComponentValues(newValues);
    isUpdatingFromUI.current = true;
    const newYaml = generateYamlFromValues(newValues, language, fileContent);
    setFileContent(newYaml);
  };

  // เปลี่ยนภาษา -> Gen ใหม่
  useEffect(() => {
    if (isAutoDetecting.current) { isAutoDetecting.current = false; return; }
    if (Object.keys(componentValues).length > 0) {
      isUpdatingFromUI.current = true;
      const newYaml = generateYamlFromValues(componentValues, language, fileContent);
      setFileContent(newYaml);
    }
  }, [language]);


  // =========================================================
  // 🔄 LISTENER: Code -> UI (Auto Detect + Two-Way Sync)
  // =========================================================
  useEffect(() => {
    if (isUpdatingFromUI.current) { isUpdatingFromUI.current = false; return; }

    // 🔥 FIX: ถ้า User ลบโค้ดหมดเกลี้ยง -> สั่งปิด Switch ทุกตัวทันที!
    if (!fileContent || !fileContent.trim()) {
      setComponentValues({
        enable_push: false,
        push_branches: [],
        enable_pr: false,
        pr_branches: []
      });
      return;
    }

    try {
      const doc: any = yaml.load(fileContent);
      if (!doc || typeof doc !== 'object') return;

      // 1. Auto-Detect Language
      let detectedLang = language;
      if (doc.workflow || doc.stages || (doc.include && !doc.on)) {
        detectedLang = 'gitlab';
      } else if (doc.on || doc.jobs) {
        detectedLang = 'github';
      }

      if (detectedLang !== language) {
        isAutoDetecting.current = true;
        setLanguage(detectedLang);
      }

      // 2. Parse Values
      const newValues: Record<string, any> = {};

      // 🟢 GitHub Parsing
      if (detectedLang === 'github') {
        if (doc.on?.push?.branches) {
          newValues['enable_push'] = true;
          newValues['push_branches'] = doc.on.push.branches;
        } else { newValues['enable_push'] = false; }

        if (doc.on?.pull_request?.branches) {
          newValues['enable_pr'] = true;
          newValues['pr_branches'] = doc.on.pull_request.branches;
        } else { newValues['enable_pr'] = false; }
      }

      // 🔴 GitLab Parsing
      else if (detectedLang === 'gitlab') {
        const rules = doc.workflow?.rules;
        const pushBranches: string[] = [];
        const prBranches: string[] = [];

        if (Array.isArray(rules)) {
          rules.forEach((rule: any) => {
            if (typeof rule.if === 'string') {
              const pushMatch = rule.if.match(/\$CI_COMMIT_BRANCH == "([^"]+)"/);
              if (pushMatch) pushBranches.push(pushMatch[1]);

              const prMatch = rule.if.match(/\$CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "([^"]+)"/);
              if (prMatch) prBranches.push(prMatch[1]);
            }
          });
        }

        newValues['enable_push'] = pushBranches.length > 0;
        newValues['push_branches'] = pushBranches;

        newValues['enable_pr'] = prBranches.length > 0;
        newValues['pr_branches'] = prBranches;
      }

      // อัปเดต UI State
      setComponentValues(prev => {
        const merged = { ...prev, ...newValues };
        const isChanged = JSON.stringify(prev) !== JSON.stringify(merged);
        return isChanged ? merged : prev;
      });

    } catch (e) { }
  }, [fileContent]);

  // =========================================================
  // 🔄 ACTION: เปลี่ยนชื่อไฟล์ (รองรับทั้ง Rename และ Create New)
  // =========================================================
  const renameCurrentFile = async (newName: string) => {

    if (!selectedRepo || !newName) return;

    // ถ้าชื่อใหม่เหมือนชื่อเดิมเป๊ะ ก็ไม่ต้องทำอะไร
    if (selectedFile && newName === selectedFile) return;

    const oldName = selectedFile || ""; // ถ้าไม่มีชื่อเก่า ให้เป็นค่าว่าง

    // 1. Lock UI
    isRenamingRef.current = true;
    setSelectedFile(newName); // เปลี่ยนชื่อหัวกระดาษรอไว้เลย

    try {
      // 2. บันทึกไฟล์ใหม่ (Save New)
      // ไม่ว่าจะเป็นการเปลี่ยนชื่อ หรือ สร้างใหม่ ก็ต้อง Save ไฟล์ใหม่ลงไปก่อน
      await fetch('/api/pipeline/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: selectedRepo.full_name,
          filePath: ".github/workflows/" + newName,
          content: fileContent, // ใช้เนื้อหาปัจจุบัน (ถ้าสร้างใหม่ เนื้อหาอาจจะว่าง หรือมี default)
          uiState: componentValues,
          branch: selectedBranch
        })
      });

      // 3. ลบไฟล์เก่า (Delete Old) 
      // 🔥 เช็คก่อน: ต้องมีชื่อเก่า และชื่อเก่าต้องไม่ว่างเปล่า ถึงจะสั่งลบ
      if (oldName && oldName.trim() !== "") {
        try {
          const fileExists = draftList.some(f => f.fileName === oldName) || gitFileList.some(f => f.fileName === oldName);
          if (fileExists) {
            await fetch('/api/pipeline/draft', {
              method: 'DELETE',
              body: JSON.stringify({
                repoFullName: selectedRepo.full_name,
                filePath: ".github/workflows/" + oldName,
                branch: selectedBranch
              })
            });
          }
        } catch (deleteError) {
          console.warn("Skipped deleting old file:", deleteError);
        }
      }

      // 4. Update Reference
      lastSavedContent.current = fileContent;

      // 5. Refresh List
      await refreshFileList();

    } catch (e) {
      console.error("Operation failed", e);
      // Revert UI กลับถ้าพังจริงๆ
      if (oldName) setSelectedFile(oldName);
      isRenamingRef.current = false;
    }
  };

  const refreshFileList = useCallback(async () => {
    if (!selectedRepo || !selectedBranch) { setFileList([]); setDraftList([]); setGitFileList([]); return; }
    try {
      const res = await fetch(`/api/pipeline/files?repoFullName=${selectedRepo.full_name}&branch=${selectedBranch}`);
      const data = await res.json();
      setDraftList(data.drafts || []); setGitFileList(data.gitFiles || []); setFileList([...(data.drafts || []), ...(data.gitFiles || [])]);
    } catch (e) { console.error(e); }
  }, [selectedRepo, selectedBranch]);

  useEffect(() => { refreshFileList(); setSelectedFile(""); setComponentValues({}); }, [refreshFileList]);

  const saveDraftToDB = useCallback(async (content: string) => {
    if (!selectedRepo || !selectedFile || content === lastSavedContent.current) return;
    try {
      setIsSaving(true);
      await fetch('/api/pipeline/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: ".github/workflows/" + selectedFile, content: content, uiState: componentValues, branch: selectedBranch || "main" })
      });
      lastSavedContent.current = content;
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  }, [selectedRepo, selectedBranch, selectedFile, componentValues]);

  useEffect(() => {
    if (!selectedRepo || !selectedFile) return;
    const timer = setTimeout(() => saveDraftToDB(fileContent), 2000);
    return () => clearTimeout(timer);
  }, [fileContent, selectedRepo, saveDraftToDB, selectedFile]);

  useEffect(() => {
    if (!selectedRepo || !selectedBranch || !selectedFile) { if (!selectedFile) { setFileContent(""); setComponentValues({}); lastSavedContent.current = ""; } return; }
    if (isRenamingRef.current) { isRenamingRef.current = false; return; }
    const loadDraft = async () => {
      try {
        const params = new URLSearchParams({ repoFullName: selectedRepo.full_name, branch: selectedBranch, filePath: ".github/workflows/" + selectedFile });
        const res = await fetch(`/api/pipeline/draft?${params.toString()}`);
        const data = await res.json();
        if (data.content !== undefined) {
          setFileContent(data.content); lastSavedContent.current = data.content;
          if (data.uiState) setComponentValues(data.uiState);
        } else { setFileContent(""); setComponentValues({}); lastSavedContent.current = ""; }
      } catch (e) { console.error(e); }
    };
    loadDraft();
  }, [selectedRepo, selectedBranch, selectedFile]);

  const commitFile = async (message: string) => {
    if (!selectedRepo || !selectedFile) return false;
    try { setIsSaving(true); const res = await fetch('/api/pipeline/commit', { method: 'POST', body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: ".github/workflows/" + selectedFile, content: fileContent, message: message, branch: selectedBranch }) }); if (res.ok) { await refreshFileList(); return true; } } catch (e) { console.error(e); } finally { setIsSaving(false); } return false;
  };

  const discardDraft = async () => { if (!selectedRepo || !selectedFile) return false; if (!confirm(`Discard changes?`)) return false; try { setIsSaving(true); const res = await fetch('/api/pipeline/draft', { method: 'DELETE', body: JSON.stringify({ repoFullName: selectedRepo.full_name, filePath: ".github/workflows/" + selectedFile, branch: selectedBranch }) }); if (res.ok) { await refreshFileList(); setSelectedFile(""); setComponentValues({}); return true; } } catch (e) { console.error(e); } finally { setIsSaving(false); } return false; };

  return (
    <PipelineContext.Provider value={{ language, setLanguage, fileContent, setFileContent, selectedRepo, setSelectedRepo, selectedBranch, setSelectedBranch, isSaving, selectedFile, setSelectedFile, fileList, draftList, gitFileList, renameCurrentFile, commitFile, discardDraft, categories, availableBranches, componentValues, updateComponentValue, provider, setProvider, fetchBranches, availableRepos, fetchRepos, isLoading, }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) throw new Error("usePipeline must be used within a PipelineProvider");
  return context;
}