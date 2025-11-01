export default function SetupBody({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        w-full overflow-hidden rounded-[16px]
        border border-white/8
        bg-[radial-gradient(77.09%_110.2%_at_50%_132.53%,#5184FB_0%,#0437AE_58.53%,#02184B_100%)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)]
        p-5
      "
    >
      {children}
    </div>
  );
}
