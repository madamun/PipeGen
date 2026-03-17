"use client";

import Link from "next/link";
import { authClient } from "../../lib/auth-client";
import UserMenu from "./UserMenu";

export default function LoginPopover() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-white/10"></div>
    );
  }

  if (data?.session) {
    return <UserMenu />;
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

