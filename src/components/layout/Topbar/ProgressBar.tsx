export default function ProgressBar({ value = 75 }: { value?: number }) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    // <div className="flex h-9 items-center gap-3 w-full max-w-2xl ">
    //   <span className="hidden sm:block text-sm text-[#FFFFFF] whitespace-nowrap leading-none">
    //     Progress Bar
    //   </span>

    //   <div className="relative h-3 w-full rounded-full bg-zinc-300">
    //     <div
    //       className="absolute left-0 top-0 h-full rounded-full bg-zinc-500"
    //       style={{ width: `${pct}%` }}
    //     />
    //   </div>

    //   <span className="text-sm text-[#FFFFFF] tabular-nums leading-none">
    //     {pct}%
    //   </span>
    // </div>
    <div></div>
  );
}
