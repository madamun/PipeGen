"use client";

import React, { useState } from "react";
import { Trash2, ChevronUp, ChevronDown, FileCode, Box } from "lucide-react";
import type { UserSectionItem } from "../../types/template";

interface TemplateItemRowProps {
  item: UserSectionItem;
  componentName?: string;
  onUpdate: (item: UserSectionItem) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function TemplateItemRow({
  item,
  componentName,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TemplateItemRowProps) {
  const [editing, setEditing] = useState(false);

  const base =
    "flex items-center gap-2 rounded-lg border border-white/10 bg-[#010819] p-2 text-sm text-slate-200";

  return (
    <div className={base}>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {item.type === "yaml_block" ? (
          editing ? (
            <div className="space-y-1">
              <input
                type="text"
                value={item.label ?? ""}
                onChange={(e) =>
                  onUpdate({ ...item, label: e.target.value || undefined })
                }
                placeholder="Label (optional)"
                className="w-full rounded border border-white/20 bg-[#02184B] px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
              />
              <textarea
                value={item.content}
                onChange={(e) =>
                  onUpdate({ ...item, content: e.target.value })
                }
                placeholder="YAML snippet..."
                rows={3}
                className="w-full rounded border border-white/20 bg-[#02184B] px-2 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 w-full text-left"
            >
              <FileCode className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="truncate">
                {item.label || item.content.slice(0, 40) || "YAML block"}
                {!item.label && item.content.length > 40 ? "..." : ""}
              </span>
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="truncate">{componentName ?? item.componentId}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-white/10 shrink-0"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
