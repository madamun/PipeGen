import Logo from "./Logo";
import SearchBar from "./SearchBar";
import Gitconnect from "./Gitconnect";

export default function Navbar() {
  return (
    <nav
      className="
        sticky top-0 z-40 border-b border-black/10 bg-[#02184B]
        flex h-16 justify-center items-end shrink-0 self-stretch
      "
    >
      {/* ซ้าย: LOGO */}
      <div className="flex flex-1 basis-0 items-center gap-2 self-stretch px-6 py-4">
        <Logo />
      </div>

      {/* กลาง: SEARCH  */}
      <div className="flex flex-1 basis-0 justify-center items-center gap-2 self-stretch px-6 py-4">
        {/* จำกัดความกว้างตามใจ (เอาออกได้ถ้าอยากเต็มคอลัมน์) */}
        <div className="w-[clamp(200px,30vw,400px)]">
          {/* <SearchBar /> */}
        </div>
      </div>

      {/* ขวา: GITCONNECT  */}
      <div className="flex flex-1 basis-0 justify-end items-center gap-4 self-stretch p-4">
        <Gitconnect />
      </div>
    </nav>
  );
}
