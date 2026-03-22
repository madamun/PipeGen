// packages/components/layout/LeftPanel/Setup/SetupSection.tsx

"use client";

import {
  Settings,
  ChevronDown,
  ChevronRight,
  Github,
  Gitlab,
  GitBranch,
  Zap,
  Server,
  Box,
  FileCode,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { Switch } from "../../../ui/switch";
import { useRef, useEffect } from "react";
import { usePipeline } from "../../../workspace/PipelineProvider";

// Map Icon (เพิ่ม Icon ให้ครบหมวดหมู่ใหม่)
const IconMap: Record<string, any> = {
  GitBranch: GitBranch,
  Settings: Settings,
  Zap: Zap,
  Server: Server,
  Box: Box,
  FileCode: FileCode,
  ShieldCheck: ShieldCheck,
  Bell: Bell,
  Default: Box,
};

interface SetupSectionProps {
  categoriesOpen: Record<string, boolean>;
  setCategoriesOpen: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  sectionsOpen: Record<string, boolean>;
  setSectionsOpen: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  searchQuery: string;
}

export default function SetupSection({
  categoriesOpen,
  setCategoriesOpen,
  sectionsOpen,
  setSectionsOpen,
  isCollapsed,
  setIsCollapsed,
  searchQuery,
}: SetupSectionProps) {
  const {
    categories,
    availableBranches,
    componentValues,
    updateComponentValue,
    language,
    setLanguage,
    fileList,
    selectedFile,
    selectedRepo,
    provider,
    scrollTarget,
    setScrollTarget,
  } = usePipeline();

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!scrollTarget) return;
    const timer = setTimeout(() => {
      const el = sectionRefs.current[scrollTarget];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-1", "ring-white/50", "pb-2",);
        setTimeout(() => {
        el.classList.remove("ring-1", "ring-white/50", "pb-2",);
        }, 2000);
      }
      setScrollTarget(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [scrollTarget, setScrollTarget]);

  const toggleCategory = (id: string, currentOpen: boolean) => {
    setCategoriesOpen((prev) => ({ ...prev, [id]: !currentOpen }));
  };

  const toggleSection = (key: string, currentOpen: boolean) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !currentOpen }));
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredCategories = q
    ? categories
        .map((cat) => ({
          ...cat,
          components: cat.components.filter(
            (comp) =>
              cat.name.toLowerCase().includes(q) ||
              comp.name.toLowerCase().includes(q),
          ),
        }))
        .filter((cat) => cat.components.length > 0)
    : categories;

  if (categories.length === 0)
    return (
      <div className="text-white/50 p-5 italic text-sm text-center">
        Loading pipeline setup...
      </div>
    );

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-3 w-full mt-2">
        {categories.map((cat) => {
          const Icon = IconMap[cat.icon || "Default"] || IconMap.Default;
          return (
            <button
              key={cat.id}
              onClick={() => {
                // พอกดไอคอน: ให้กางหน้าต่างออก แล้วเปิดหมวดหมู่นี้ให้เลยอัตโนมัติ
                if (setIsCollapsed) setIsCollapsed(false);
                setCategoriesOpen((prev) => ({ ...prev, [cat.id]: true }));
              }}
              title={cat.name}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-[#5184FB]/20 hover:border-[#5184FB]/50 transition-all text-white/70 hover:text-white shrink-0"
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4 px-1 pb-10">
      {filteredCategories.length === 0 && q ? (
        <p className="text-slate-500 text-sm text-center py-6">
          No components match &quot;{searchQuery}&quot;
        </p>
      ) : null}
      {filteredCategories.map((cat) => {
        const Icon = IconMap[cat.icon || "Default"] || IconMap.Default;
        const isCatOpen = categoriesOpen[cat.id] ?? false;

        return (
          <div key={cat.id} className="space-y-1">
            {/* HEADER Category */}
            <button
              type="button"
              onClick={() => toggleCategory(cat.id, isCatOpen)}
              className="
                relative w-full overflow-hidden rounded-2xl
                bg-[linear-gradient(0deg,rgba(0,0,0,0.2)0%,rgba(0,0,0,0.2)100%),radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
                border border-white/10 shadow-lg px-5 py-2 flex items-center justify-center z-10
                hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
              "
            >
              <div className="absolute left-5 top-1/2 -translate-y-1/2">
                <div className="h-9 w-9 rounded-full grid place-items-center bg-white/10">
                  <Icon className="text-white" />
                </div>
              </div>
              <h2 className="text-[#E6EDFE] text-xl font-bold leading-10">
                {cat.name}
              </h2>
              <ChevronDown
                className={`absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/90 transition-transform duration-300 ${isCatOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            {/* BODY */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${isCatOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="w-full rounded-2xl border border-white/10 bg-[radial-gradient(77.09%_110.2%_at_50%_132.53%,#5184FB_0%,#0437AE_58.53%,#02184B_100%)] p-4 space-y-1">
                  {/* Platform Selection */}
                  {cat.slug === "general" && (
                    <div className="mb-4">
                      <div className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-2 ml-1 opacity-70">
                        Target Platform
                      </div>
                      <div className="inline-flex items-center gap-2 w-full">
                        <button
                          onClick={() => setLanguage("github")}
                          className={`flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${language === "github" ? "bg-[#2EA44F] text-white border-[#2EA44F]" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}
                        >
                          <Github className="h-4 w-4" /> GitHub
                        </button>
                        <button
                          onClick={() => setLanguage("gitlab")}
                          className={`flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${language === "gitlab" ? "bg-[#E2432A] text-white border-[#E2432A]" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}
                        >
                          <Gitlab className="h-4 w-4" /> GitLab
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Components Loop */}
                  {cat.components.map((comp: any) => {
                    const isOpen =
                      sectionsOpen[comp.name.toLowerCase()] ?? true;

                    return (
                      <div
                        key={comp.id}
                        ref={(el) => { sectionRefs.current[comp.name.toLowerCase()] = el; }}
                        className="mt-2 border-t border-white/5 pt-2 first:border-0 first:pt-0 transition-all duration-300"
                      >
                        <button
                          onClick={() =>
                            toggleSection(comp.name.toLowerCase(), isOpen)
                          }
                          className="flex items-center gap-2 w-full py-2 hover:bg-white/5 rounded px-2 transition-colors group"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-white/70 group-hover:text-white" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white" />
                          )}
                          <span className="text-base font-semibold text-white/90 group-hover:text-white">
                            {comp.name}
                          </span>
                        </button>

                        <div
                          className={`pl-6 flex flex-col gap-3 overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}
                        >
                          {isOpen &&
                            (comp.uiConfig?.description ||
                              comp.uiConfig?.secretsHelp ||
                              (selectedRepo?.full_name &&
                                comp.uiConfig?.settingsPathByProvider?.[
                                  provider
                                ])) && (
                              <div className="mb-2 space-y-1.5 pb-2 border-b border-white/5">
                                {comp.uiConfig?.description && (
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                    {comp.uiConfig.description}
                                  </p>
                                )}
                                {comp.uiConfig?.secretsHelp && (
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    {comp.uiConfig.secretsHelp}
                                  </p>
                                )}
                                {selectedRepo?.full_name &&
                                  comp.uiConfig?.settingsPathByProvider?.[
                                    provider
                                  ] && (
                                    <a
                                      href={
                                        provider === "github"
                                          ? `https://github.com/${selectedRepo.full_name}/${comp.uiConfig.settingsPathByProvider.github}`
                                          : `https://gitlab.com/${selectedRepo.full_name}/${comp.uiConfig.settingsPathByProvider.gitlab}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-300 hover:text-blue-200 hover:underline"
                                    >
                                      {provider === "github"
                                        ? "Open repo Settings → Secrets"
                                        : "Open CI/CD settings"}
                                    </a>
                                  )}
                              </div>
                            )}
                          {comp.uiConfig?.fields?.map((field: any) => {
                            // Check Visibility
                            if (field.visibleIf) {
                              const targetVal =
                                componentValues[field.visibleIf.fieldId];
                              if (targetVal !== field.visibleIf.value)
                                return null;
                            }

                            if (field.type === "switch") {
                              return (
                                <div
                                  key={field.id}
                                  className="flex items-center justify-start gap-3 py-1.5 ml-1"
                                >
                                  <Switch
                                    id={field.id}
                                    checked={componentValues[field.id] === true}
                                    onCheckedChange={(c) =>
                                      updateComponentValue(field.id, c)
                                    }
                                    className="data-[state=checked]:bg-[#5184FB]" // สีฟ้าตามธีม
                                  />
                                  <label
                                    htmlFor={field.id}
                                    className="text-sm text-slate-200 cursor-pointer select-none hover:text-white transition-colors font-medium"
                                  >
                                    {field.label}
                                  </label>
                                </div>
                              );
                            }

                            // Input Field
                            if (field.type === "input") {
                              return (
                                <div
                                  key={field.id}
                                  className="flex flex-col gap-1.5 py-1 ml-1"
                                >
                                  <label className="text-xs text-slate-400 font-medium">
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      componentValues[field.id] !== undefined
                                        ? componentValues[field.id]
                                        : field.defaultValue || ""
                                    }
                                    onChange={(e) =>
                                      updateComponentValue(
                                        field.id,
                                        e.target.value,
                                      )
                                    }
                                    onKeyDown={(e) => e.stopPropagation()}
                                    placeholder={field.placeholder || ""}
                                    className="w-full bg-[#010819]/50 border border-white/10 text-slate-200 text-sm rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                                  />
                                </div>
                              );
                            }

                            // Select Dropdown
                            if (field.type === "select") {
                              return (
                                <div
                                  key={field.id}
                                  className="flex flex-col gap-1.5 py-1 ml-1"
                                >
                                  <label
                                    htmlFor={`setup-select-${field.id}`}
                                    className="text-xs text-slate-400 font-medium"
                                  >
                                    {field.label}
                                  </label>
                                  <div className="relative">
                                    <select
                                      id={`setup-select-${field.id}`}
                                      title={field.label}
                                      value={
                                        componentValues[field.id] !== undefined
                                          ? componentValues[field.id]
                                          : field.defaultValue || ""
                                      }
                                      onChange={(e) =>
                                        updateComponentValue(
                                          field.id,
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-[#010819]/50 border border-white/10 text-slate-200 text-sm rounded-md px-3 py-2 appearance-none focus:border-blue-500 focus:outline-none cursor-pointer"
                                    >
                                      {field.options?.map((opt: any) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                      <ChevronDown className="h-3 w-3 text-slate-500" />
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Branch Select
                            if (field.type === "branch_select") {
                              const raw = componentValues[field.id];
                              const currentVal: string[] = Array.isArray(raw)
                                ? raw
                                : [];
                              return (
                                <div
                                  key={field.id}
                                  className="py-2 ml-1 bg-[#010819]/20 p-3 rounded-lg border border-white/5"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-blue-300 uppercase tracking-wider font-bold">
                                      {field.label}
                                    </label>
                                    {availableBranches.length === 0 && (
                                      <span className="text-xs text-yellow-500">
                                        Waiting for branches...
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {availableBranches.map((branch) => {
                                      const isSelected =
                                        currentVal.includes(branch);
                                      return (
                                        <label
                                          key={branch}
                                          className={`
                                          flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer border text-xs transition-all select-none
                                          ${isSelected ? "bg-[#5184FB] border-[#5184FB] text-white font-medium shadow-md" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-400"}
                                        `}
                                        >
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const newVal = e.target.checked
                                                ? [...currentVal, branch]
                                                : currentVal.filter(
                                                  (b: string) => b !== branch,
                                                );
                                              updateComponentValue(
                                                field.id,
                                                newVal,
                                              );
                                            }}
                                          />
                                          {isSelected && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                          )}
                                          {branch}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            
                            // File Multi Select
                            
                            if (field.type === "file_multi_select") {
                              const currentVal = (componentValues[field.id] as string[]) || [];

                              // กรองเอาเฉพาะไฟล์อื่นที่ไม่ใช่ไฟล์ที่กำลังเปิดอยู่
                              const availableFiles = fileList
                                .filter((f) => f.fileName !== selectedFile)
                                .map((f) => f.fullPath);

                              return (
                                <div key={field.id} className="py-2 ml-1 bg-[#010819]/20 p-3 rounded-lg border border-white/5">
                                  <label className="text-xs text-blue-300 uppercase tracking-wider font-bold mb-2 block">
                                    {field.label}
                                  </label>

                                  {availableFiles.length === 0 ? (
                                    <span className="text-xs text-slate-500 italic">No other pipeline files found</span>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      {availableFiles.map((path) => {
                                        const isSelected = currentVal.includes(path);
                                        return (
                                          <label
                                            key={path}
                                            className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all select-none ${isSelected
                                                ? "bg-[#5184FB]/20 border-[#5184FB] text-white"
                                                : "border-white/5 hover:bg-white/10 text-slate-400"
                                              }`}
                                          >
                                            <input
                                              type="checkbox"
                                              className="hidden"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                const newVal = e.target.checked
                                                  ? [...currentVal, path]
                                                  : currentVal.filter((p: string) => p !== path);
                                                updateComponentValue(field.id, newVal);
                                              }}
                                            />
                                            {/* กล่อง Checkbox จำลองสวยๆ */}
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-500 bg-black/20"
                                              }`}>
                                              {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                            </div>
                                            <span className="text-xs font-mono text-slate-300 truncate tracking-tight">{path}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
