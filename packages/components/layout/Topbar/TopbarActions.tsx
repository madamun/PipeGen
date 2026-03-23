"use client";

import { useState, useMemo } from "react";
import { Button } from "../../ui/button";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { usePipeline } from "../../workspace/PipelineProvider";
import { getSuggestions } from "../../../lib/suggestions";
import SuggestionsDialog from "../../suggestions/SuggestionsDialog";

export default function TopbarActions() {
  // 🟢 ดึงข้อมูลทั้งหมดรวมถึง dismissedSuggestions มาจาก Context ทีเดียวเลย
  const { autoSetup, isAnalyzing, componentValues, categories, activeTab, dismissedSuggestions } = usePipeline();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // 🟢 ใช้ dismissedSuggestions จาก Context ในการคำนวณแทน
  const suggestions = useMemo(
    () => activeTab ? getSuggestions(componentValues, categories, dismissedSuggestions) : [],
    [componentValues, categories, activeTab, dismissedSuggestions],
  );
  const suggestionCount = suggestions.length;

  return (
    <div className="flex h-9 items-center gap-3">
      <Button
        onClick={() => setSuggestionsOpen(true)}
        variant="outline"
        // ⚪️ ปุ่ม Suggestions: เรียบๆ คลีนๆ ไม่แย่งซีน
        className="group h-9 px-4 rounded-xl border  border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 relative shadow-sm"
        title="Recommended additions"
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

      <SuggestionsDialog
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
      />

      <Button
        onClick={autoSetup}
        disabled={isAnalyzing}
        className="h-9 rounded-xl bg-[#07003f] text-white hover:bg-[#0a0050] transition-all"
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
  );
}