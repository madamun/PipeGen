"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { usePipeline } from "../workspace/PipelineProvider";
import { getSuggestions } from "../../lib/suggestions";
import type { Suggestion, SuggestionCategory } from "../../lib/suggestions";
import { Lightbulb, ArrowRight, Zap, ShieldCheck, Bell, EyeOff, Eye, FileCode, ArrowLeft } from "lucide-react";

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  performance: "Performance",
  security: "Security",
  notifications: "Notifications",
};

const CATEGORY_ICONS: Record<SuggestionCategory, typeof Zap> = {
  performance: Zap,
  security: ShieldCheck,
  notifications: Bell,
};

const PRIORITY_STYLES: Record<
  Suggestion["priority"],
  { label: string; className: string }
> = {
  high: { label: "High", className: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
  low: { label: "Low", className: "bg-slate-600/40 text-slate-300 border border-slate-500/30" },
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function SuggestionsDialog({ open, onOpenChange }: Props) {
  // 🟢 ดึง state และฟังก์ชันจัดการ Dismiss จาก Context
  const { 
    componentValues, 
    categories, 
    navigateToBlock, 
    activeTab, 
    dismissedSuggestions, 
    dismissSuggestion, 
    resetDismissedSuggestions 
  } = usePipeline();

  // 🟢 โยน dismissedSuggestions ที่ได้จาก Context เข้าไปกรอง
  const suggestions = getSuggestions(componentValues, categories, dismissedSuggestions);

  const byCategory = suggestions.reduce<Record<SuggestionCategory, Suggestion[]>>(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<SuggestionCategory, Suggestion[]>,
  );

  const handleGoToLeftPanel = (s: Suggestion) => {
    navigateToBlock(s.targetCategoryId, s.targetComponentName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col bg-[#02184B] border-white/10 text-slate-200 ">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-white">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Recommended additions
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between -mt-2">
          <p className="text-sm text-slate-400">
            Things you might want to add to your pipeline.
          </p>
          {dismissedSuggestions.size > 0 && (
            <button
              type="button"
              // 🟢 เรียกฟังก์ชัน Reset จาก Context
              onClick={resetDismissedSuggestions}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md bg-white/5 border border-white/5 hover:bg-white/10"
              title="Show all dismissed suggestions"
            >
              <Eye className="h-3.5 w-3.5" />
              {/* 🟢 อัปเดตขนาด size จาก Context */}
              <span>Show {dismissedSuggestions.size} hidden</span>
            </button>
          )}
        </div>

        {!activeTab ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-white/5 grid place-items-center">
              <FileCode className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-300 font-medium">No file selected</p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Select a repo, pick a branch, then create or open a pipeline file to see suggestions.
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 grid place-items-center">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300 font-medium">Your setup looks good!</p>
            <p className="text-xs text-slate-500">No suggestions right now. All recommended features are enabled.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar pb-2">
            {(["performance", "security", "notifications"] as const).map(
              (cat) => {
                const items = byCategory[cat];
                if (!items?.length) return null;
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#5184FB]" />
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <ul className="space-y-3">
                      {items.map((s) => {
                        const priorityStyle = PRIORITY_STYLES[s.priority];
                        return (
                          <li
                            key={s.id}
                            className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-white text-[15px]">
                                {s.title}
                              </span>
                              <span
                                className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${priorityStyle.className}`}
                              >
                                {priorityStyle.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                              {s.description}
                            </p>
                            <p className="text-[13px] text-slate-300 mt-3 flex items-center gap-1 opacity-90">
                              {s.steps}
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                variant="outline"
                                className="h-9 px-4 border-[#5184FB]/40 text-[#5184FB] hover:bg-[#5184FB] hover:text-white hover:border-[#5184FB] transition-all shadow-sm"
                                onClick={() => handleGoToLeftPanel(s)}
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Set up now
                              </Button>
                              <button
                                type="button"
                                // 🟢 โยน ID ไปให้ Context จัดการ
                                onClick={() => dismissSuggestion(s.id)}
                                className="h-9 w-9 grid place-items-center rounded-md bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all shadow-sm"
                                title="Hide this suggestion"
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}