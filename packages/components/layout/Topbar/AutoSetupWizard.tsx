"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import {
  Sparkles, Box, TestTube, Shield, Code, Container,
  Rocket, Bell, Database, Gauge, PackageCheck, KeyRound,
} from "lucide-react";

interface DetectedItem {
  icon: React.ReactNode;
  label: string;
  detail?: string;
}

interface OptionalItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  defaultChecked: boolean;
}

interface AutoSetupWizardProps {
  open: boolean;
  config: Record<string, any>;
  repoFullName?: string;
  provider?: "github" | "gitlab";
  onConfirm: (extras: Record<string, boolean>) => void;
  onClose: () => void;
}

export default function AutoSetupWizard({ open, config, repoFullName, provider, onConfirm, onClose }: AutoSetupWizardProps) {
  const [extras, setExtras] = React.useState<Record<string, boolean>>({});

  // สร้างรายการ detected
  const detected = React.useMemo<DetectedItem[]>(() => {
    const items: DetectedItem[] = [];
    if (config.detected_framework) {
      items.push({ icon: <Box className="h-4 w-4 text-blue-400" />, label: config.detected_framework, detail: `Node ${config.node_version || "18"}` });
    } else if (config.use_node) {
      items.push({ icon: <Box className="h-4 w-4 text-green-400" />, label: config.pkg_manager === "bun" ? "Bun" : "Node.js", detail: `v${config.node_version || "18"}` });
    }
    if (config.use_python) items.push({ icon: <Box className="h-4 w-4 text-yellow-400" />, label: "Python", detail: `v${config.py_version || "3.9"}` });
    if (config.use_go) items.push({ icon: <Box className="h-4 w-4 text-cyan-400" />, label: "Go", detail: `v${config.go_version || "1.21"}` });
    if (config.use_rust) items.push({ icon: <Box className="h-4 w-4 text-orange-400" />, label: "Rust", detail: config.rust_version || "stable" });
    if (config.has_prisma) items.push({ icon: <Database className="h-4 w-4 text-indigo-400" />, label: "Prisma", detail: "prisma generate" });
    if (config.docker_build) {
      const count = config.all_dockerfiles?.length || 1;
      items.push({ icon: <Container className="h-4 w-4 text-sky-400" />, label: "Docker", detail: count > 1 ? `${count} Dockerfiles found` : "Dockerfile found" });
    }
    if (config.detected_test_framework) items.push({ icon: <TestTube className="h-4 w-4 text-emerald-400" />, label: config.detected_test_framework, detail: config.test_cmd });
    if (config.check_quality) items.push({ icon: <Code className="h-4 w-4 text-purple-400" />, label: "ESLint", detail: config.lint_cmd });
    if (config.enable_cache) items.push({ icon: <Gauge className="h-4 w-4 text-amber-400" />, label: "Cache", detail: config.cache_path });
    if (config.is_monorepo) items.push({ icon: <Box className="h-4 w-4 text-pink-400" />, label: "Monorepo", detail: `${config.sub_projects?.length || 0} projects` });
    if (config.detected_docker_path && config.detected_docker_path !== "Dockerfile") {
      items.push({ icon: <Container className="h-4 w-4 text-orange-400" />, label: "Docker (subfolder)", detail: config.detected_docker_path });
    }
    return items;
  }, [config]);

  // สร้างรายการ optional
  const optionals = React.useMemo<OptionalItem[]>(() => {
    const items: OptionalItem[] = [];
    if (!config.run_tests) items.push({ id: "run_tests", icon: <TestTube className="h-4 w-4" />, label: "Automated Testing", description: "Run tests on every push", defaultChecked: false });
    if (!config.check_quality) items.push({ id: "check_quality", icon: <Code className="h-4 w-4" />, label: "Code Linting", description: "Check code quality with ESLint", defaultChecked: false });
    if (!config.enable_security) items.push({ id: "enable_security", icon: <Shield className="h-4 w-4" />, label: "Security Scanning", description: "Run npm audit / Trivy", defaultChecked: false });
    if (config.docker_build && !config.docker_push) items.push({ id: "docker_push", icon: <Container className="h-4 w-4" />, label: "Push to Docker Hub", description: "Push image after build", defaultChecked: false });
    if (!config.docker_build) items.push({ id: "docker_build", icon: <Container className="h-4 w-4" />, label: "Docker Build & Push", description: "Build image and push to registry", defaultChecked: false });
    if (!config.deploy_vercel) items.push({ id: "deploy_vercel", icon: <Rocket className="h-4 w-4" />, label: "Deploy to Vercel", description: "Auto-deploy after build", defaultChecked: false });
    if (!config.enable_slack) items.push({ id: "enable_slack", icon: <Bell className="h-4 w-4" />, label: "Slack Notification", description: "Notify on pipeline result", defaultChecked: false });
    return items;
  }, [config]);

  // init extras เมื่อ open
  React.useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {};
      optionals.forEach(o => { init[o.id] = o.defaultChecked; });
      setExtras(init);
    }
  }, [open, optionals]);

  const toggleExtra = (id: string) => {
    setExtras(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const secretsNeeded = React.useMemo(() => {
    const secrets: { name: string; reason: string }[] = [];

    // จาก config ที่ detect ได้
    if (config.docker_build) {
      secrets.push({ name: "DOCKER_USERNAME", reason: "Docker Hub login" });
      secrets.push({ name: "DOCKER_PASSWORD", reason: "Docker Hub login" });
    }

    // จาก extras ที่ user เลือก
    if (extras.docker_build || extras.docker_push) {
      if (!secrets.find(s => s.name === "DOCKER_USERNAME")) {
        secrets.push({ name: "DOCKER_USERNAME", reason: "Docker Hub login" });
        secrets.push({ name: "DOCKER_PASSWORD", reason: "Docker Hub login" });
      }
    }
    if (extras.deploy_vercel || config.deploy_vercel) {
      secrets.push({ name: "VERCEL_TOKEN", reason: "Vercel deployment" });
    }
    if (extras.enable_slack || config.enable_slack) {
      secrets.push({ name: "SLACK_WEBHOOK_URL", reason: "Slack notification" });
    }
    if (extras.enable_coverage || config.enable_coverage) {
      secrets.push({ name: "CODECOV_TOKEN", reason: "Coverage upload" });
    }

    return secrets;
  }, [config, extras]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => { if (!next) onClose(); },
    [onClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[1%] translate-y-0 max-w-[28rem] w-full border border-[#B4CAFD] text-slate-50 bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)] p-5 pt-2 pb-3 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-400" />
            Auto Setup Summary
          </DialogTitle>
          <DialogDescription className="text-sm text-[#B4CAFD] mt-0">
            We analyzed your repository and found the following
          </DialogDescription> 
        </DialogHeader>

        {/* Detected Technologies — 2 columns */}
        <div className="mt-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Detected</p>
          <div className="bg-black/20 border border-white/10 rounded-lg p-2.5 pt-1.5 pb-1.5 grid grid-cols-2 gap-x-15 gap-y-1.5">
            {detected.length > 0 ? detected.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {item.icon}
                <span className="font-medium text-white">{item.label}</span>
                {item.detail && <span className="text-slate-400 text-[11px] ml-auto truncate max-w-25">{item.detail}</span>}
              </div>
            )) : (
              <p className="text-xs text-slate-400 col-span-2">No specific framework detected</p>
            )}
          </div>
        </div>

        {/* Optional section compact */}
         {/* Sub-project details */}
        {config.sub_project_details && config.sub_project_details.length > 0 && (
          <div className="mt-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Sub-projects</p>
            <div className="bg-black/20 border border-white/10 rounded-lg p-2.5 pt-1.5 pb-1.5 space-y-1">
              {config.sub_project_details.map((detail: string, i: number) => (
                <div key={i} className="text-xs text-slate-300 font-mono">
                  📁 {detail}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Additions */}
        {optionals.length > 0 && (
          <div className="mt-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Would you like to add?</p>
            <div className="space-y-1">
              {optionals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleExtra(item.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all text-left text-xs
                    ${extras[item.id]
                      ? "border-blue-400/50 bg-blue-500/15 text-white"
                      : "border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                    }`}
                >
                  <div className={`flex items-center justify-center h-4 w-4 rounded border transition-all shrink-0
                    ${extras[item.id] ? "border-blue-400 bg-blue-500 text-white" : "border-white/30"}`}>
                    {extras[item.id] && <span className="text-[10px]">✓</span>}
                  </div>
                  <span className="opacity-70">{item.icon}</span>
                  <span className="font-medium whitespace-nowrap">{item.label}</span>
                  <span className="text-[11px] text-slate-400 ml-auto truncate">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secrets Warning */}
        {secretsNeeded.length > 0 && (
          <div className="mt-0">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider  flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Secrets Required
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 pt-1.5 pb-1.5 space-y-1">
              {secretsNeeded.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <code className="font-mono text-amber-300 bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{s.name}</code>
                  <span className="text-slate-400 text-[11px] ml-auto">{s.reason}</span>
                </div>
              ))}
              <p className="text-[12px] text-slate-300 mt-0.5 pt-0.5 border-t border-white/5">
                Add these in{" "}
                {repoFullName ? (
                  <a
                    href={
                      provider === "gitlab"
                        ? `https://gitlab.com/${repoFullName}/-/settings/ci_cd`
                        : `https://github.com/${repoFullName}/settings/secrets/actions`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    repo Settings → Secrets
                  </a>
                ) : (
                  "repo Settings → Secrets"
                )}{" "}
                before running the pipeline.
              </p>
            </div>
          </div>
        )}

        {/* Buttons compact */}
        <div className="flex flex-col gap-1 ">
          <Button
            className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2f6ad6] text-white rounded-lg py-2.5 shadow-md shadow-blue-500/20"
            onClick={() => onConfirm(extras)}
          >
            <Sparkles className="h-4 w-4" />
            Generate Pipeline
          </Button>
          <Button
            variant="secondary"
            className="w-full border border-white/30 text-white bg-transparent hover:bg-white/10 rounded-lg py-2"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}