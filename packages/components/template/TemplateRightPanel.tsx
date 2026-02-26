"use client";

import React, { useCallback } from "react";
import TemplateItemRow from "./TemplateItemRow";
import AddItemMenu from "./AddItemMenu";
import { usePipeline } from "../workspace/PipelineProvider";
import type { UserSection, UserSectionItem } from "../../types/template";
import type { PipelineComponent } from "../../types/pipeline";

function getComponentName(
  componentId: string,
  components: PipelineComponent[]
): string | undefined {
  return components.find((c) => c.id === componentId)?.name;
}

interface TemplateRightPanelProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  selectedSection: UserSection | null;
  onUpdateSection: (section: UserSection) => void;
  createId: () => string;
}

export default function TemplateRightPanel({
  templateName,
  onTemplateNameChange,
  selectedSection,
  onUpdateSection,
  createId,
}: TemplateRightPanelProps) {
  const { categories } = usePipeline();
  const components = categories.flatMap((c) => c.components);

  if (!selectedSection) {
    return (
      <div className="flex flex-col h-full bg-[#02184B] overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-white/10">
          <input
            type="text"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="ชื่อ template"
            aria-label="ชื่อ template"
            className="w-full rounded border border-white/20 bg-[#010819] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          เลือกหมวดทางซ้าย
        </div>
      </div>
    );
  }

  const sortedItems = [...selectedSection.items].sort((a, b) => a.order - b.order);

  const updateItem = useCallback(
    (index: number, item: UserSectionItem) => {
      const next = sortedItems.map((it, i) => (i === index ? item : it));
      onUpdateSection({
        ...selectedSection,
        items: next.map((it, i) => ({ ...it, order: i })),
      });
    },
    [selectedSection, onUpdateSection, sortedItems]
  );

  const deleteItem = useCallback(
    (index: number) => {
      const next = sortedItems.filter((_, i) => i !== index);
      onUpdateSection({
        ...selectedSection,
        items: next.map((it, i) => ({ ...it, order: i })),
      });
    },
    [selectedSection, onUpdateSection, sortedItems]
  );

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const next = [...sortedItems];
      const j = direction === "up" ? index - 1 : index + 1;
      if (j < 0 || j >= next.length) return;
      [next[index], next[j]] = [next[j], next[index]];
      onUpdateSection({
        ...selectedSection,
        items: next.map((it, i) => ({ ...it, order: i })),
      });
    },
    [selectedSection, onUpdateSection, sortedItems]
  );

  const handleAddItem = useCallback(
    (item: UserSectionItem) => {
      const newItem = { ...item, order: selectedSection.items.length };
      onUpdateSection({
        ...selectedSection,
        items: [...selectedSection.items, newItem],
      });
    },
    [selectedSection, onUpdateSection]
  );

  return (
    <div className="flex flex-col h-full bg-[#02184B] overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-white/10 space-y-2">
        <input
          type="text"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          placeholder="ชื่อ template"
          aria-label="ชื่อ template"
          className="w-full rounded border border-white/20 bg-[#010819] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
        />
        <p className="text-xs text-slate-400">หมวด: {selectedSection.name}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {sortedItems.map((item, index) => (
          <TemplateItemRow
            key={item.id}
            item={item}
            componentName={
              item.type === "component_ref"
                ? getComponentName(item.componentId, components)
                : undefined
            }
            onUpdate={(updated) => updateItem(index, updated)}
            onDelete={() => deleteItem(index)}
            onMoveUp={() => moveItem(index, "up")}
            onMoveDown={() => moveItem(index, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < sortedItems.length - 1}
          />
        ))}
        <AddItemMenu
          nextOrder={selectedSection.items.length}
          onCreateId={createId}
          onAdd={handleAddItem}
          components={components}
        />
      </div>
    </div>
  );
}
