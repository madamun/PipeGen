"use client";

import { useState } from "react";
import { signIn } from "../../packages/lib/auth-client"; 
import { Github, Gitlab, Flame } from "lucide-react"; 
import Image from "next/image";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLogin = async (provider: "github" | "gitlab") => {
    setIsLoading(provider);
    try {
      await signIn.social({
        provider: provider,
        callbackURL: "/", 
      });
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center background: linear-gradient(180deg, #010819 0%, rgba(2, 24, 75, 0.85) 100% ) overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />

      {/* กล่อง Login แบบกระจก  */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800/60 bg-[#0A101A]/80 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* โลโก้ & หัวข้อ */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner">
            <Image
              src="/logo.svg"
              alt="Pipe Gen Logo"
              width={50}
              height={50}
              priority
              className="drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Welcome to Pipe Gen</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to manage your CI/CD pipelines
          </p>
        </div>

        {/* ปุ่ม Login */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleLogin("github")}
            disabled={isLoading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292e] px-4 py-3.5 text-sm font-medium text-white transition-all hover:bg-[#2c3137] hover:shadow-lg hover:shadow-black/50 disabled:opacity-50"
          >
            <Github className="h-5 w-5" />
            {isLoading === "github" ? "Connecting..." : "Continue with GitHub"}
          </button>

          <button
            onClick={() => handleLogin("gitlab")}
            disabled={isLoading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#fc6d26] px-4 py-3.5 text-sm font-medium text-white transition-all hover:bg-[#fd7e3e] hover:shadow-lg hover:shadow-black/50 disabled:opacity-50"
          >
            <Gitlab className="h-5 w-5" />
            {isLoading === "gitlab" ? "Connecting..." : "Continue with GitLab"}
          </button>
        </div>

        {/* สำหรับคนอยากสลับบัญชี */}
        <div className="mt-8 border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500">
          <p>Need to switch accounts?</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="https://github.com/logout" target="_blank" rel="noreferrer" className="transition-colors hover:text-slate-300">
              Sign out of GitHub
            </a>
            <span className="text-slate-700">•</span>
            <a href="https://gitlab.com/users/sign_out" target="_blank" rel="noreferrer" className="transition-colors hover:text-slate-300">
              Sign out of GitLab
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}