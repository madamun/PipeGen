// packages/components/layout/RightPanel/RightPanel.tsx

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Plus,
  Pencil,
  FolderOpen,
  Trash2,
  FileClock,
  Github,
  X,
  MoreVertical,
  GitBranch,
  X as XIcon,
} from "lucide-react";
import EditorBody from "./EditorBody";
import CommitDialog from "../../commit/CommitDialog";
import EditorToolbar from "./EditorToolbar";
import EditorAIPanel from "./EditorAIPanel";
import { usePipeline } from "../../workspace/PipelineProvider";
import { getSuggestions } from "../../../lib/suggestions";
import { Button } from "../../ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../ui/dropdown-menu";

interface EditorHeaderProps {
  zoom: number;
  setZoom: (z: number) => void;
  isDiffMode: boolean;
  setIsDiffMode: (v: boolean) => void;
  onOpenAIPanel?: () => void;
}

function FileButtons({
  handleCreateNew,
  draftList,
  gitFileList,
  setSelectedFile,
  getShortName,
  align,
}: {
  handleCreateNew: () => void;
  draftList: any[];
  gitFileList: any[];
  setSelectedFile: (f: string) => void;
  getShortName: (p: string) => string;
  align?: "start" | "end";
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCreateNew}
            aria-label="New file"
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all mt-1.5"
          >
            <Plus className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
        >
          New File
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger aria-label="Open file" className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all outline-none mt-1.5">
              <FolderOpen className="h-4 w-4" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
          >
            Open File
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align={align || "end"} className="bg-[#0f1e50] border-white/20 text-white min-w-64 max-w-sm max-h-96 overflow-y-auto">
          {draftList.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-amber-400 font-normal px-2 py-1 flex items-center gap-2">
                <FileClock className="w-3 h-3" /> Draft Files
              </DropdownMenuLabel>
              {draftList.map((f: any) => (
                <DropdownMenuItem
                  key={f.fullPath}
                  onClick={() => setSelectedFile(f.fullPath)}
                  title={f.fullPath}
                  className="cursor-pointer hover:bg-white/10 pl-6 focus:bg-white/10 focus:text-white"
                >
                  <span className="text-amber-200 flex-1 truncate">{getShortName(f.fileName)}</span>
                  <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                    Draft
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
            </>
          )}
          <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2 py-1 flex items-center gap-2">
            <Github className="w-3 h-3" /> Repository Files
          </DropdownMenuLabel>
          {gitFileList.length === 0 ? (
            <div className="px-6 py-2 text-xs text-slate-500 italic space-y-0.5">
              <p>No workflow files yet.</p>
              <p className="text-slate-600">Use + to create a new file.</p>
            </div>
          ) : (
            gitFileList.map((f: any) => (
              <DropdownMenuItem
                key={f.fullPath}
                onClick={() => setSelectedFile(f.fullPath)}
                title={f.fullPath}
                className="cursor-pointer hover:bg-white/10 pl-6 focus:bg-white/10 focus:text-white"
              >
                {getShortName(f.fileName)}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function EditorHeader({
  zoom,
  setZoom,
  isDiffMode,
  setIsDiffMode,
  onOpenAIPanel,
}: EditorHeaderProps) {
  const {
    openTabs,
    activeTab,
    setActiveTab,
    closeTab,
    setSelectedFile,
    draftList,
    gitFileList,
    renameCurrentFile,
    discardDraft,
    provider,
    fileContent,
  } = usePipeline();

  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isCurrentFileDraft = React.useMemo(
    () => draftList.some((f) => f.fullPath === activeTab || f.fileName === activeTab),
    [draftList, activeTab],
  );

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.value) inputRef.current.select();
    }
  }, [isEditing]);

  const startRenaming = () => {
    if (!activeTab) return;
    const shortName = activeTab.split('/').pop() || "";
    setTempName(shortName);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    let counter = 1;
    let newName = "Untitled.yml";
    while (openTabs.includes(newName)) {
      newName = `Untitled-${counter}.yml`;
      counter++;
    }

    setSelectedFile(newName);
    setTempName("");

    setTimeout(() => {
      setIsEditing(true);
    }, 50);
  };

  const saveName = () => {
    let finalName = tempName.trim();
    if (!finalName) {
      setIsEditing(false);
      if (activeTab.startsWith("Untitled")) closeTab(activeTab);
      return;
    }
    if (!finalName.endsWith(".yml") && !finalName.endsWith(".yaml"))
      finalName += ".yml";

    renameCurrentFile(finalName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") {
      setIsEditing(false);
      if (activeTab.startsWith("Untitled")) closeTab(activeTab);
    }
  };

  const getShortName = (path: string) => path ? path.split('/').pop() || path : "";

  const hasTabs = openTabs.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-10 w-full justify-between items-end border-b border-white/10 bg-[#02184B] select-none">

        {/* ฝั่งซ้าย: tabs + ปุ่ม +/📁 ตอนไม่มี tab */}
        <div className="flex flex-1 h-full overflow-x-auto overflow-y-hidden no-scrollbar items-end pl-2">
          {!hasTabs && (
            <div className="flex items-center gap-1.5 h-full pb-0.5">
              <FileButtons
                handleCreateNew={handleCreateNew}
                draftList={draftList}
                gitFileList={gitFileList}
                setSelectedFile={setSelectedFile}
                getShortName={getShortName}
                align="start"
              />
            </div>
          )}
          {openTabs.map((tab) => {
            const isActive = tab === activeTab;
            const isDraft = draftList.some((f) => f.fullPath === tab || f.fileName === tab);
            const shortName = getShortName(tab);

            return (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                title={tab}
                className={`group flex items-center gap-2 px-3 h-[calc(100%+1px)] min-w-[130px] max-w-[220px] cursor-pointer relative
                  ${isActive
                    ? 'bg-[#010819] text-blue-50 border-t-2 border-t-blue-500 border-x border-white/10 border-b border-b-[#010819] z-10'
                    : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border-t-2 border-t-transparent border-l border-transparent border-r border-white/10 border-b border-transparent z-0'
                  }
                `}
              >
                <span className={`inline-block h-2 w-2 rounded-full shrink-0 transition-colors ${isDraft ? (isActive ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-amber-600/70") : "bg-slate-600"}`} />

                {isActive && isEditing ? (
                  <input
                    ref={inputRef}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={handleKeyDown}
                    placeholder="name..."
                    className="bg-transparent text-white border-b border-blue-500 outline-none w-full h-4 text-[13px] leading-none"
                  />
                ) : (
                  <span
                    className="truncate flex-1 text-[13px] tracking-wide"
                    onDoubleClick={(e) => {
                      if (isActive && provider !== "gitlab") {
                        e.stopPropagation();
                        startRenaming();
                      }
                    }}
                  >
                    {shortName}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab);
                  }}
                  className={`p-0.5 rounded-md transition-all shrink-0 ml-auto
                    ${isActive ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* ฝั่งขวา: toolbar + ปุ่ม +/📁 (เฉพาะตอนมี tab) */}
        <div className="flex items-center gap-1.5 px-3 pb-1.5 shrink-0 h-full relative z-20">

          {activeTab && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger aria-label="File Actions" className="h-7 w-7 mr-1 mt-1.5 grid place-items-center rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all outline-none border-r border-transparent">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
                >
                  File Actions
                </TooltipContent>
              </Tooltip>

              <DropdownMenuContent align="end" className="bg-[#0f1e50] border-white/20 text-white min-w-40 mt-1">
                <DropdownMenuLabel className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1.5">
                  File Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={startRenaming}
                  disabled={provider === "gitlab"}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 text-[13px] py-1.5"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rename File</span>
                </DropdownMenuItem>

                {isCurrentFileDraft && (
                  <DropdownMenuItem
                    onClick={discardDraft}
                    className="cursor-pointer hover:bg-white/10 focus:bg-red-500/20 focus:text-red-300 text-red-400 gap-2 text-[13px] py-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Discard Draft</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasTabs && (
            <FileButtons
              handleCreateNew={handleCreateNew}
              draftList={draftList}
              gitFileList={gitFileList}
              setSelectedFile={setSelectedFile}
              getShortName={getShortName}
              align="end"
            />
          )}

          <div className="ml-1 pl-2 mt-1.5 border-l border-white/10 h-7 flex items-center">
            <EditorToolbar
              content={fileContent}
              fileName={activeTab}
              zoom={zoom}
              setZoom={setZoom}
              isDiffMode={isDiffMode}
              setIsDiffMode={setIsDiffMode}
              onOpenAIPanel={onOpenAIPanel}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function RightPanel({ onOpenAIPanel }: { onOpenAIPanel?: () => void }) {
  const [fontSize, setFontSize] = React.useState(13);
  const [isDiffMode, setIsDiffMode] = React.useState(false);
  const [commitOpen, setCommitOpen] = React.useState(false);
  const [hasYamlErrors, setHasYamlErrors] = React.useState(false);
  const [isRollingBack, setIsRollingBack] = React.useState(false);

  const {
    selectedRepo,
    activeTab,
    fileContent,
    setSelectedRepo,
    setSelectedBranch,
    setSelectedFile,
    setFileContent,
    availableRepos
  } = usePipeline();

  const showCommitButton = !!selectedRepo?.full_name && !!activeTab;
  const commitDisabled = !fileContent?.trim() || hasYamlErrors;

  const commitTitle = !fileContent?.trim()
    ? "Select a repository and a file to commit"
    : hasYamlErrors
      ? "Fix YAML errors in the editor before committing"
      : "Commit";

  if (!selectedRepo) {
    return (
      <section className="flex flex-col mr-6 flex-1 rounded-2xl shadow-[2px_4px_8px_rgba(0,0,0,0.30)] bg-[#02184B] h-full overflow-hidden relative z-0 items-center justify-center">
        <div className="text-center px-8 max-w-md space-y-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#5184FB]/10 grid place-items-center">
            <GitBranch className="h-7 w-7 text-[#5184FB]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              Welcome to Pipe Gen
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Build CI/CD pipelines visually — no YAML knowledge needed.
            </p>
          </div>
          <div className="text-left space-y-3 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-[#5184FB]/20 text-[#5184FB] text-xs font-bold grid place-items-center">1</span>
              <div>
                <p className="text-sm text-slate-200 font-medium">Select a repository</p>
                <p className="text-xs text-slate-500">Use the dropdown at the top-left to connect your GitHub or GitLab repo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-[#5184FB]/20 text-[#5184FB] text-xs font-bold grid place-items-center">2</span>
              <div>
                <p className="text-sm text-slate-200 font-medium">Pick a branch</p>
                <p className="text-xs text-slate-500">Choose which branch you want to add or edit a pipeline on.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-[#5184FB]/20 text-[#5184FB] text-xs font-bold grid place-items-center">3</span>
              <div>
                <p className="text-sm text-slate-200 font-medium">Create or open a pipeline file</p>
                <p className="text-xs text-slate-500">Use (+) to create new, or open an existing file from your repo.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Or click <span className="text-amber-400 font-medium">Auto Setup</span> to generate a pipeline from your project automatically.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col mr-3 flex-1 rounded-2xl shadow-[2px_4px_8px_rgba(0,0,0,0.30)] bg-[#02184B] h-full overflow-hidden relative z-0">
      <EditorHeader
        zoom={fontSize}
        setZoom={setFontSize}
        isDiffMode={isDiffMode}
        setIsDiffMode={setIsDiffMode}
        onOpenAIPanel={onOpenAIPanel}
      />
      <div className="flex-1 bg-[#010819] overflow-auto relative">

        {isRollingBack && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#010819]/80 backdrop-blur-sm">
            <div className="text-5xl mb-4 animate-bounce">⏳</div>
            <h3 className="text-lg font-bold text-white mb-2 tracking-wide">Time Traveling...</h3>
            <p className="text-sm text-blue-300 animate-pulse">Restoring your code from the past</p>
          </div>
        )}

        <EditorBody
          fontSize={fontSize}
          isDiffMode={isDiffMode}
          onValidationChange={(errors) => setHasYamlErrors(errors.length > 0)}
        />
        {showCommitButton && (
          <Button
            onClick={() => setCommitOpen(true)}
            disabled={commitDisabled}
            title={commitTitle}
            className="absolute bottom-4 right-4 z-10 h-9 rounded-lg bg-[#3b82f6] px-4 shadow-md hover:bg-[#2f6ad6] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010819]"
          >
            Commit
          </Button>
        )}
      </div>
      <CommitDialog open={commitOpen} onOpenChange={setCommitOpen} />
      <SuggestionHint />
    </section>
  );
}

function SuggestionHint() {
  const { componentValues, categories, activeTab, dismissedSuggestions } = usePipeline();
  const [dismissed, setDismissed] = useState(false);

  React.useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(timer);
  }, [dismissed, activeTab]);

  const suggestions = getSuggestions(componentValues, categories, dismissedSuggestions);
  const count = suggestions.length;

  if (!activeTab || count === 0 || dismissed) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-[#0f1e50] border border-white/20 px-3 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-xs text-amber-400">💡</span>
      <span className="text-xs text-slate-300">
        {count} suggestion{count > 1 ? "s" : ""} available
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-slate-500 hover:text-white ml-1"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
}