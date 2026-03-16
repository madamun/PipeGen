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

// Component / category types (align with API and Prisma shape)
export interface ComponentSyntax {
  id?: string;
  componentId?: string;
  platform: string;
  template: string;
}

export interface ComponentFieldOption {
  value: string;
  label?: string;
}

export interface ComponentField {
  id: string;
  type: string;
  defaultValue?: string | number | boolean | string[];
  platformDefaults?: Record<string, string | number | boolean | string[]>;
  options?: ComponentFieldOption[];
}

export interface ComponentUiConfig {
  fields?: ComponentField[];
  /** Short description of what this block does. */
  description?: string;
  /** Help text for which secrets/variables to set and where. */
  secretsHelp?: string;
  /** Path segment for repo settings URL by provider (e.g. GitHub Secrets, GitLab CI/CD). */
  settingsPathByProvider?: { github?: string; gitlab?: string };
}

export interface PipelineComponent {
  id: string;
  categoryId: string;
  name: string;
  type: string;
  uiConfig?: ComponentUiConfig | null;
  syntaxes?: ComponentSyntax[];
}

export interface ComponentCategory {
  id: string;
  name: string;
  slug?: string;
  displayOrder?: number;
  icon?: string | null;
  components: PipelineComponent[];
}

/** Values from UI form (field id -> value) */
export type ComponentValues = Record<
  string,
  string | number | boolean | string[] | undefined
>;

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

  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  closeTab: (tab: string) => void;

  originalContent: string;

  fileList: PipelineFile[];
  draftList: PipelineFile[];
  gitFileList: PipelineFile[];
  isSaving: boolean;
  isLoading: boolean;
  isAnalyzing: boolean;
  isRollingBack: boolean;
  renameCurrentFile: (newName: string) => void;
  commitFile: (message: string) => Promise<boolean>;
  discardDraft: () => Promise<boolean>;
  categories: ComponentCategory[];
  componentValues: ComponentValues;
  updateComponentValue: (
    id: string,
    val: string | number | boolean | string[] | undefined,
  ) => void;

  autoSetup: () => Promise<void>;
}
