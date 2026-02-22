"use client";

import { useMemo } from "react";
import { authClient } from "../../lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function UserMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;

  const initials = useMemo(() => {
    const n = user?.name || user?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [user?.name, user?.email]);

  if (!data?.session || !user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="h-9 w-9 overflow-hidden rounded-full border border-white/20 ring-0 outline-none focus:ring-2 focus:ring-white/30"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-700 text-slate-100 text-sm">
              {initials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-white/15 bg-gradient-to-b from-[#0f2a7a] to-[#0a1a4a] text-slate-100 p-0 shadow-xl"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-4 py-3 font-normal">
          <div className="h-7 w-7 overflow-hidden rounded-full border border-white/20 shrink-0">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-700 text-slate-100 text-xs">
                {initials}
              </div>
            )}
          </div>
          <span className="text-base font-medium truncate">
            {user.name || user.email || "User"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem
          className="cursor-pointer py-3 text-base focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
          disabled
        >
          Setting
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer py-3 text-base focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
          disabled
        >
          Help
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer py-3 text-base focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
          onClick={() =>
            authClient.signOut({
              fetchOptions: { redirect: "follow" },
              query: { redirectTo: "/" },
            })
          }
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
