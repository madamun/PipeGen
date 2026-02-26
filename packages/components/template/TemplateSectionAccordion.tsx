"use client";

import React, { useState, useEffect } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import TemplateItemRow from "./TemplateItemRow";
import AddItemMenu from "./AddItemMenu";
import type { UserSection, UserSectionItem } from "../../types/template";
import type { PipelineComponent } from "../../types/pipeline";

interface TemplateSectionAccordionProps {
  section: UserSection;
  components: PipelineComponent[];
  onUpdateSection: (section: UserSection) => void;
  onDeleteSection: () => void;
  onMoveSectionUp: () => void;
  onMoveSectionDown: () => void;
  canMoveSectionUp: boolean;
  canMoveSectionDown: boolean;
  createId: () => string;
}

function getComponentName(
  componentId: string,
  components: PipelineComponent[]
): string | undefined {
  return components.find((c) => c.id === componentId)?.name;
}

export default function TemplateSectionAccordion({
  section,
  components,
  onUpdateSection,
  onDeleteSection,
  onMoveSectionUp,
  onMoveSectionDown,
  canMoveSectionUp,
  canMoveSectionDown,
  createId,
}: TemplateSectionAccordionProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);
  useEffect(() => {
    if (!editingName) setNameDraft(section.name);
  }, [section.name, editingName]);

  const sortedItems = [...section.items].sort((a, b) => a.order - b.order);

  const updateItem = (index: number, item: UserSectionItem) => {
    const next = sortedItems.map((it, i) => (i === index ? item : it));
    onUpdateSection({
      ...section,
      items: next.map((it, i) => ({ ...it, order: i })),
    });
  };

  const deleteItem = (index: number) => {
    const next = sortedItems.filter((_, i) => i !== index);
    onUpdateSection({
      ...section,
      items: next.map((it, i) => ({ ...it, order: i })),
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const next = [...sortedItems];
    const j = direction === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onUpdateSection({
      ...section,
      items: next.map((it, i) => ({ ...it, order: i })),
    });
  };

  const handleAddItem = (item: UserSectionItem) => {
    const newItem = { ...item, order: section.items.length };
    onUpdateSection({
      ...section,
      items: [...section.items, newItem],
    });
  };

  const saveName = () => {
    if (nameDraft.trim()) {
      onUpdateSection({ ...section, name: nameDraft.trim() });
    }
    setEditingName(false);
  };

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem
        value={section.id}
        className="border border-white/10 rounded-lg mb-2 bg-[#010819]/50 overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5 [&[data-state=open]>svg]:rotate-180">
          <div className="flex items-center gap-2 w-full pr-2">
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSectionUp();
                }}
                disabled={!canMoveSectionUp}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                aria-label="Move section up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSectionDown();
                }}
                disabled={!canMoveSectionDown}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                aria-label="Move section down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {editingName ? (
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                onClick={(e) => e.stopPropagation()}
                placeholder="ชื่อหมวด"
                aria-label="Section name"
                className="flex-1 min-w-0 rounded border border-white/20 bg-[#02184B] px-2 py-1 text-sm text-slate-200"
                autoFocus
              />
            ) : (
              <span
                className="flex-1 text-left font-medium text-slate-200"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingName(true);
                }}
              >
                {section.name}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSection();
              }}
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-white/10 shrink-0"
              aria-label="Delete section"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-0">
          <div className="space-y-2">
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
              nextOrder={section.items.length}
              onCreateId={createId}
              onAdd={handleAddItem}
              components={components}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
