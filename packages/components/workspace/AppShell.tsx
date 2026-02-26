"use client";

import React, { useState } from "react";
import Topbar from "../layout/Topbar";
import FlipModeView from "./FlipModeView";
import type { AppMode } from "../layout/Topbar";

export default function AppShell() {
  const [mode, setMode] = useState<AppMode>("pipeline");

  return (
    <main className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
      <Topbar mode={mode} onModeChange={setMode} />
      <FlipModeView mode={mode} />
    </main>
  );
}
