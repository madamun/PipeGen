
"use client";

import LanguageSection from "./LanguageSection";
import TriggerSection from "./TriggerSection";
import { usePipeline } from "@/components/workspace/PipelineProvider";

export default function SetupContent() {
  return (
    <>
      <LanguageSection />
      <TriggerSection />
    </>
  );
}
