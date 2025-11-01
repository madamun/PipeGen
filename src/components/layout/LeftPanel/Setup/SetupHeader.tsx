import { Settings } from "lucide-react";
import { ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export default function SetupHeader({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="
        relative w-full overflow-hidden rounded-[16px]
        bg-[linear-gradient(0deg,rgba(0,0,0,0.2)0%,rgba(0,0,0,0.2)100%),radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)]
        border border-white/10
        shadow-[0_8px_24px_rgba(0,0,0,0.35)]
        px-5 py-2
        flex items-center justify-center
      "
    >
      {/* ไอคอนซ้าย */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2">
        <div className="h-9 w-9 rounded-full grid place-items-center">
          {" "}
          <Settings />
        </div>
      </div>

      {/* ข้อความกลาง */}
      <h2 className="text-var(--Primary-Blue-50, #E6EDFE) text-2xl not-italic font-bold leading-10">
        Setup
      </h2>

      {/* caret ขวา */}
      <ChevronDown
        className={`
          absolute right-5 top-1/2 -translate-y-1/2
          h-5 w-5 text-white/90 transition-transform
          ${open ? "rotate-180" : "rotate-0"}
        `}
      />
    </button>
  );
}
