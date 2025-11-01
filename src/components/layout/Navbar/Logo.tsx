import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <Image
        src="/logo.svg"
        alt="Logo"
        width={40} 
        height={40}
        priority
      />
      <span className="bg-gradient-to-r from-[#E6EDFE] to-[#83A7FC] bg-clip-text text-2xl font-semibold text-transparent">
        Pipe Gen
      </span>
    </Link>
  );
}
