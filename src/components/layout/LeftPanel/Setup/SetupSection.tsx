"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePipeline } from "@/components/workspace/PipelineProvider"; // ✅ ใช้ Provider ตัวใหม่

// Map Icon
const IconMap: Record<string, any> = {
  GitBranch: GitBranch,
  Settings: Settings,
  Zap: Zap,
  Server: Server,
  Default: Box,
};

export default function SetupSection() {
  // --- STATE UI (เก็บไว้เหมือนเดิม) ---
  const [categoriesOpen, setCategoriesOpen] = useState<Record<string, boolean>>({});
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    git: true,
    trigger: true,
  });

  // --- 🔥 เรียก DATA จาก Provider (เปลี่ยนจาก server action เดิม) ---
  const {
    categories,             // รายการปุ่ม
    availableBranches,      // รายชื่อ Branch
    componentValues,        // ค่าที่ User กรอก
    updateComponentValue,   // ฟังก์ชันอัปเดต
    language,               // ภาษา
    setLanguage
  } = usePipeline();

  const toggleCategory = (id: string) => {
    setCategoriesOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (categories.length === 0)
    return <div className="text-white/50 p-5 italic text-sm">Loading configuration...</div>;

  return (
    <div className="w-full max-w-[680px] space-y-4 px-1">
      {categories.map((cat) => {
        const Icon = IconMap[cat.icon || "Default"] || IconMap.Default;
        const isCatOpen = categoriesOpen[cat.id] ?? true;

        return (
          <div key={cat.id} className="space-y-1">

            {/* ============================================== */}
            {/* 1. HEADER ใหญ่ (Gradient แบบเก่าที่คุณชอบ)      */}
            {/* ============================================== */}
            <button
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className="
                relative w-full overflow-hidden rounded-[16px]
                bg-[linear-gradient(0deg,rgba(0,0,0,0.2)0%,rgba(0,0,0,0.2)100%),radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
                border border-white/10 shadow-lg px-5 py-2 flex items-center justify-center z-10
              "
            >
              <div className="absolute left-5 top-1/2 -translate-y-1/2">
                <div className="h-9 w-9 rounded-full grid place-items-center">
                  <Icon className="text-white" />
                </div>
              </div>
              <h2 className="text-[#E6EDFE] text-2xl font-bold leading-10">
                {cat.name}
              </h2>
              <ChevronDown
                className={`absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/90 transition-transform duration-300 ${isCatOpen ? "rotate-180" : "rotate-0"
                  }`}
              />
            </button>

            {/* ============================================== */}
            {/* 2. BODY (กล่องสีน้ำเงินเข้ม แบบเก่า)             */}
            {/* ============================================== */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${isCatOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
            >
              <div className="overflow-hidden">
                <div className="w-full rounded-[16px] border border-white/10 bg-[radial-gradient(77.09%_110.2%_at_50%_132.53%,#5184FB_0%,#0437AE_58.53%,#02184B_100%)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)] p-4 space-y-1">

                  {/* --- ส่วน Platform (Hardcoded เหมือนเดิม) --- */}
                  {cat.slug === "source_control" && (
                    <div className="mb-2">
                      <button
                        onClick={() => toggleSection("git")}
                        className="flex items-center gap-2 w-full py-2 hover:bg-white/5 rounded px-2 transition-colors"
                      >
                        {sectionsOpen["git"] ? (
                          <ChevronDown className="h-4 w-4 text-white" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white" />
                        )}
                        <span className="text-lg font-semibold text-white">Platform</span>
                      </button>

                      {/* Buttons เลือก GitHub/GitLab */}
                      <div
                        className={`pl-8 overflow-hidden transition-all duration-300 ${sectionsOpen["git"] ? "max-h-[100px] opacity-100 mt-2" : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setLanguage("github")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${language === "github" ? "bg-[#6B8CFF] text-white" : "text-slate-300 hover:bg-white/10"
                              }`}
                          >
                            <Github className="h-4 w-4" /> GitHub
                          </button>
                          <button
                            onClick={() => setLanguage("gitlab")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${language === "gitlab" ? "bg-[#E2432A] text-white" : "text-slate-300 hover:bg-white/10"
                              }`}
                          >
                            <Gitlab className="h-4 w-4" /> GitLab
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- ส่วน Dynamic Components (Trigger ฯลฯ) --- */}
                  {cat.components.map((comp: any) => {
                    const isOpen = sectionsOpen[comp.name.toLowerCase()] ?? true;

                    return (
                      <div key={comp.id} className="mt-4">
                        {/* หัวข้อ Component เช่น "Trigger" */}
                        <button
                          onClick={() => toggleSection(comp.name.toLowerCase())}
                          className="flex items-center gap-2 w-full py-2 hover:bg-white/5 rounded px-2 transition-colors"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-white" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white" />
                          )}
                          <span className="text-lg font-semibold text-white">
                            {comp.name}
                          </span>
                        </button>

                        {/* Fields ภายใน */}
                        <div
                          className={`
                            pl-8 flex flex-col gap-2 overflow-hidden transition-all duration-300
                            ${isOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"}
                          `}
                        >
                          {comp.uiConfig?.fields?.map((field: any) => {

                            // 🔥 Logic 1: Check VisibleIf (ซ่อน/แสดง ตาม Switch)
                            if (field.visibleIf) {
                              const targetVal = componentValues[field.visibleIf.fieldId];
                              if (targetVal !== field.visibleIf.value) return null;
                            }

                            // 🟢 SWITCH (ดีไซน์เดิม: Switch ซ้าย, Label ขวา)
                            if (field.type === "switch") {
                              return (
                                <div key={field.id} className="flex items-center gap-3 py-1">
                                  <Switch
                                    id={field.id}
                                    checked={componentValues[field.id] === true}
                                    onCheckedChange={(c) => updateComponentValue(field.id, c)}
                                    className="data-[state=checked]:bg-[#6B8CFF]"
                                  />
                                  <label
                                    htmlFor={field.id}
                                    className="text-[15px] text-slate-300 cursor-pointer select-none hover:text-white transition-colors"
                                  >
                                    {field.label}
                                  </label>
                                </div>
                              );
                            }

                            // 🔵 BRANCH SELECTOR (เพิ่มใหม่ แต่ทำสไตล์ให้เข้ากับธีมเดิม)
                            if (field.type === "branch_select") {
                              const currentVal = componentValues[field.id] || [];
                              return (
                                <div key={field.id} className="py-2 animate-in fade-in slide-in-from-top-1 ml-1">
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">{field.label}</label>
                                    {availableBranches.length === 0 && <span className="text-[10px] text-yellow-500">Loading branches...</span>}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {availableBranches.map((branch) => {
                                      const isSelected = currentVal.includes(branch);
                                      return (
                                        <label key={branch} className={`
                                                  flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer border text-xs transition-all select-none
                                                  ${isSelected
                                            ? "bg-[#6B8CFF]/20 border-[#6B8CFF] text-[#E6EDFE]"
                                            : "bg-white/5 border-transparent hover:bg-white/10 text-slate-400"}
                                              `}>
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const newVal = e.target.checked
                                                ? [...currentVal, branch]
                                                : currentVal.filter((b: string) => b !== branch);
                                              updateComponentValue(field.id, newVal);
                                            }}
                                          />
                                          {/* จุดสีเล็กๆ แสดงสถานะเลือก */}
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#6B8CFF]" />}
                                          {branch}
                                        </label>
                                      )
                                    })}
                                  </div>
                                  {availableBranches.length === 0 && (
                                    <div className="text-xs text-slate-500 italic mt-1">No branches found. Check repo connection.</div>
                                  )}
                                </div>
                              )
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