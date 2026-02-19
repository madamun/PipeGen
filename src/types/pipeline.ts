// src/types/pipeline.ts

export interface Repo {
  id: number | string;
  name: string;
  full_name: string;
  default_branch?: string;
  provider?: string;
}

export interface PipelineFile {
  fileName: string;
  fullPath: string;
}

export interface PipelineContextType {
  language: string;
  setLanguage: (lang: string) => void;
  provider: "github" | "gitlab";
  setProvider: (p: "github" | "gitlab") => void;
  availableRepos: Repo[];
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

  fileList: PipelineFile[];
  draftList: PipelineFile[];
  gitFileList: PipelineFile[];
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