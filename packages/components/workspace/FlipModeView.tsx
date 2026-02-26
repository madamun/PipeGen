"use client";

import React from "react";
import type { AppMode } from "../layout/Topbar";
import Workspace from "./Workspace";
import TemplateView from "./TemplateView";

interface FlipModeViewProps {
  mode: AppMode;
}

export default function FlipModeView({ mode }: FlipModeViewProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden min-h-[calc(100dvh-128px)] [perspective:1000px]">
      <div
        className={`relative w-full h-full transition-transform duration-[600ms] ease-in-out [transform-style:preserve-3d] ${
          mode === "template" ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
        }`}
      >
        {/* Face 1: Pipeline */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)]">
          <Workspace />
        </div>
        {/* Face 2: Template */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <TemplateView />
        </div>
      </div>
    </div>
  );
}
