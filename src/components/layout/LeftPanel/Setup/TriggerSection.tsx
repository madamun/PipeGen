// src/components/layout/LeftPanel/Setup/TriggerSection.tsx
"use client";
import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { usePipeline } from "@/components/workspace/PipelineProvider";

export default function TriggerSection() {
  const { triggers, setTriggers, selectedBranch } = usePipeline();

  // helper: toggle push / pull_request โดยคง UI เดิม (แค่สวิตช์ 2 อัน)
  const toggle = (key: "push" | "pull_request", enabled: boolean) => {
    setTriggers((t) => {
      const current = t?.[key] ?? { enabled: false, branches: [] as string[] };
      const fallback = selectedBranch || "main";
      return {
        ...t,
        [key]: {
          enabled,
          // เปิดแล้วไม่มีสาขา -> ใส่ default, ปิด -> ล้างให้ว่าง
          branches: enabled
            ? (current.branches?.length ? current.branches : [fallback])
            : [],
        },
      };
    });
  };

  const pushEnabled = !!triggers?.push?.enabled;
  const prEnabled = !!triggers?.pull_request?.enabled;

  return (
    <section className="flex flex-col items-start gap-2 self-stretch mt-6">
      <div className="flex items-center self-stretch p-0">
        <h4 className="text-[#E6EDFE] text-[20px] font-semibold leading-8">Triggers</h4>
      </div>

      <div className="flex flex-col justify-center items-start gap-2 self-stretch">
        <div className="flex items-start gap-4">
          <Switch
            checked={pushEnabled}
            onCheckedChange={(v) => toggle("push", v)}
          />
          <span className="text-[16px] leading-6 text-[#E6EDFE]">On Push</span>
        </div>

        <div className="flex items-start gap-4">
          <Switch
            checked={prEnabled}
            onCheckedChange={(v) => toggle("pull_request", v)}
          />
          <span className="text-[16px] leading-6 text-[#E6EDFE]">On Pull Request</span>
        </div>
      </div>
    </section>
  );
}
