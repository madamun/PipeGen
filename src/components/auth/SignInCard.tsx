"use client";

import { Button } from "@/components/ui/button";
import { Github, Gitlab } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function SignInCard() {
  const signInGithub = () =>
    authClient.signIn.social({ provider: "github", callbackURL: "/" });

  return (
    <div
      className="
        inline-flex h-[167px] p-2 flex-col items-start gap-2
        rounded-[8px] border border-[#B4CAFD]
        bg-[linear-gradient(0deg,rgba(0,0,0,0.2)0%,rgba(0,0,0,0.2)100%),radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
      "
    >
      <div className="px-0 pb-0 justify-center items-start gap-2 self-stretch">
        <h3 className="text-white text-center text-xl font-semibold leading-8">
          Sign in
        </h3>
      </div>

      <div className="flex flex-col items-start gap-2 p-2 w-full">
        <Button
          className="flex px-4 py-2 justify-center items-center gap-2 self-stretch rounded-lg bg-gray-900 shadow-sm hover:bg-[#343A40]"
          onClick={signInGithub}
        >
          <Github className="h-5 w-5" />
          <p className="text-white text-center text-base font-medium leading-6">
            Login with Github
          </p>
        </Button>

        {/* ตอนนี้ GitLab เป็น UI อย่างเดียว */}
        <Button
          disabled
          className="flex px-4 py-2 justify-center items-center gap-2 self-stretch rounded-lg bg-[#E2432A] shadow-sm hover:bg-[#DF614D] disabled:opacity-70"
        >
          <Gitlab className="h-5 w-5" />
          <p className="text-white text-center text-base font-medium leading-6">
            Login with Gitlab
          </p>
        </Button>
      </div>
    </div>
  );
}
