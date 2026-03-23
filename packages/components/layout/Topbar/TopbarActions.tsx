"use client";

import { useState, useMemo } from "react";
import { Button } from "../../ui/button";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { usePipeline } from "../../workspace/PipelineProvider";
import { getSuggestions } from "../../../lib/suggestions";
import SuggestionsDialog from "../../suggestions/SuggestionsDialog";

export default function TopbarActions() {
  const { autoSetup, isAnalyzing, componentValues, categories } = usePipeline();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestions = useMemo(
    () => getSuggestions(componentValues, categories),
    [componentValues, categories],
  );
  const suggestionCount = suggestions.length;

  return (
    <div className="flex h-9 items-center gap-3">
      <Button
        onClick={() => setSuggestionsOpen(true)}
        variant="outline"
        className="h-9 rounded-xl border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 relative"
        title="Recommended additions"
      >
        <Lightbulb className="mr-2 h-4 w-4 text-yellow-400" />
        Suggestions
        {suggestionCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing repository...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
            Auto Setup
          </>
        )}
      </Button>
    </div>
  );
}
