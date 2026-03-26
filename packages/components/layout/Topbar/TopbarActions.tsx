"use client";

import { useState, useMemo } from "react";
import { Button } from "../../ui/button";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { usePipeline } from "../../workspace/PipelineProvider";
import { getSuggestions } from "../../../lib/suggestions";
import SuggestionsDialog from "../../suggestions/SuggestionsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";

export default function TopbarActions() {

  const { autoSetup, isAnalyzing, componentValues, categories, activeTab, dismissedSuggestions } = usePipeline();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestions = useMemo(
    () => activeTab ? getSuggestions(componentValues, categories, dismissedSuggestions) : [],
    [componentValues, categories, activeTab, dismissedSuggestions],
  );
  const suggestionCount = suggestions.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-9 items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setSuggestionsOpen(true)}
              variant="outline"
              // ⚪️ ปุ่ม Suggestions: เรียบๆ คลีนๆ ไม่แย่งซีน
              className="group h-9 px-4 rounded-xl border  border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 relative shadow-sm"
            >
              <Lightbulb className="mr-2 h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:scale-110 group-hover:brightness-125" />
              <span className="font-medium tracking-wide text-sm">Suggestions</span>
              
              {suggestionCount > 0 && (
                // ใช้ border-2 border-[#02184B] เจาะขอบตัวเลขให้กลืนกับพื้นหลัง Navbar
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-sm border-2 border-[#02184B] animate-in zoom-in duration-300">
                  {suggestionCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
          >
            Recommended additions
          </TooltipContent>
        </Tooltip>

        <SuggestionsDialog
          open={suggestionsOpen}
          onOpenChange={setSuggestionsOpen}
        />

        <Button
          onClick={autoSetup}
          disabled={isAnalyzing}
          className="group h-9 px-4 rounded-xl border  border-white/15  bg-blue-700 text-white/85 hover:text-white hover:bg-blue-600 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)]  transition-all duration-300 active:scale-95 active:translate-y-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/80" />
              <span className="font-medium tracking-wide text-sm">Analyzing...</span>
            </>
          ) : (
            <>
              {/* เปลี่ยนสีดาวให้เป็นฟ้าอ่อน (blue-200) เพื่อให้คุมโทนน้ำเงินทั้งปุ่ม */}
              <Sparkles className="mr-2 h-4 w-4 text-blue-200 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span className="font-medium tracking-wide text-sm">Auto Setup</span>
            </>
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}