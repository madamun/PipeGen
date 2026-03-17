"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { UserSection } from "../../types/template";

interface TemplateLeftPanelProps {
  sections: UserSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onUpdateSection: (section: UserSection) => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (id: string, direction: "up" | "down") => void;
  onAddSection: () => void;
}

export default function TemplateLeftPanel({
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onMoveSection,
  onAddSection,
}: TemplateLeftPanelProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full bg-[#02184B] overflow-hidden">
      <div className="shrink-0 px-3 py-3 border-b border-white/10">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          โครง template
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sorted.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            isSelected={selectedSectionId === section.id}
            onSelect={() => onSelectSection(section.id)}
            onUpdate={(updated) => onUpdateSection(updated)}
            onDelete={() => onDeleteSection(section.id)}
            onMoveUp={() => onMoveSection(section.id, "up")}
            onMoveDown={() => onMoveSection(section.id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < sorted.length - 1}
          />
        ))}
        <button
          type="button"
          onClick={onAddSection}
          className="flex items-center gap-2 w-full rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-400 hover:border-[#5184FB]/50 hover:bg-white/10 hover:text-slate-200 transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          เพิ่มหมวด
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  section: UserSection;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (s: UserSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);
  useEffect(() => {
    if (!editing) setNameDraft(section.name);
  }, [section.name, editing]);

  const saveName = () => {
    if (nameDraft.trim()) onUpdate({ ...section, name: nameDraft.trim() });
    setEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
        isSelected
          ? "border-[#5184FB]/60 bg-[#5184FB]/10"
          : "border-white/20 bg-[#010819]/80 hover:border-white/30 hover:bg-[#010819]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            aria-label="เลื่อนขึ้น"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            aria-label="เลื่อนลง"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        {editing ? (
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="ชื่อหมวด"
            aria-label="ชื่อหมวด"
            className="flex-1 min-w-0 rounded border border-white/20 bg-[#02184B] px-2 py-0.5 text-sm text-slate-200"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm text-slate-200 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {section.name}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-white/10 shrink-0"
          aria-label="ลบหมวด"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
