"use client";

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
import { Lightbulb, ArrowRight, Zap, ShieldCheck, Bell } from "lucide-react";

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
  high: { label: "High", className: "bg-amber-500/20 text-amber-400" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-400" },
  low: { label: "Low", className: "bg-slate-500/20 text-slate-400" },
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export default function SuggestionsDialog({ open, onOpenChange }: Props) {
  const { componentValues, categories, navigateToBlock } = usePipeline();
  const suggestions = getSuggestions(componentValues, categories);

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
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col bg-[#02184B] border-white/10 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-white">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Recommended additions
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400 -mt-2">
          Things you might want to add to your pipeline.
        </p>

        {suggestions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No suggestions right now. Your setup looks good.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
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
                            className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-white">
                                {s.title}
                              </span>
                              <span
                                className={`shrink-0 text-xs px-2 py-0.5 rounded ${priorityStyle.className}`}
                              >
                                {priorityStyle.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">
                              {s.description}
                            </p>
                            <p className="text-xs text-slate-500">
                              {s.steps}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 border-[#5184FB]/50 text-[#5184FB] hover:bg-[#5184FB]/20"
                              onClick={() => handleGoToLeftPanel(s)}
                            >
                              Go to Left Panel
                              <ArrowRight className="ml-2 h-3.5 w-3.5" />
                            </Button>
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
