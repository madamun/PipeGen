"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History } from "lucide-react";
import { authClient } from "../../lib/auth-client";
import UserMenu from "./UserMenu";
import { Home } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function LoginPopover() {
  const { data, isPending } = authClient.useSession();
  const pathname = usePathname();

  if (isPending) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-white/10"></div>
    );
  }

  if (data?.session) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2.5">

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/history"
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-sm transition-all
                 ${pathname === "/history" ? "bg-transparent border-white/10 text-slate-300" : "bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/10"}`}
              >
                <History className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide">
              Activity History
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-sm transition-all
                ${pathname === "/" ? "bg-transparent border-white/10 text-slate-300" : "bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/10"}`}
              >
                <Home className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide">
              Home
            </TooltipContent>
          </Tooltip>
          <UserMenu />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#02184B]"
    >
      Sign in
    </Link>
  );
}