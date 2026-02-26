"use client";

import React, { useState } from "react";
import { Plus, FileCode, Box } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import type { UserSectionItem } from "../../types/template";
import type { PipelineComponent } from "../../types/pipeline";

interface AddItemMenuProps {
  nextOrder: number;
  onCreateId: () => string;
  onAdd: (item: UserSectionItem) => void;
  components: PipelineComponent[];
}

export default function AddItemMenu({
  nextOrder,
  onCreateId,
  onAdd,
  components,
}: AddItemMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAddYaml = () => {
    onAdd({
      id: onCreateId(),
      type: "yaml_block",
      order: nextOrder,
      content: "",
    });
    setOpen(false);
  };

  const handleAddComponent = (componentId: string) => {
    onAdd({
      id: onCreateId(),
      type: "component_ref",
      order: nextOrder,
      componentId,
    });
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-400 hover:border-[#5184FB]/50 hover:bg-white/10 hover:text-slate-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          เพิ่มรายการ
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="bg-[#0f1e50] border-white/20 text-slate-200 min-w-52"
      >
        <DropdownMenuLabel className="text-xs text-slate-400">
          เลือกประเภท
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={handleAddYaml}
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
        >
          <FileCode className="h-4 w-4" />
          YAML block
        </DropdownMenuItem>
        {components.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="text-xs text-slate-400">
              อ้าง component
            </DropdownMenuLabel>
            {components.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => handleAddComponent(c.id)}
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10 gap-2"
              >
                <Box className="h-4 w-4" />
                {c.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
