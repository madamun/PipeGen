import { ArrowLeftToLine } from 'lucide-react';
import { ChevronsUpDown } from 'lucide-react';
import SearchBar from '../../common/SearchBar';


export default function LeftTop() {
  return (
    <div
      className="
        flex h-11 items-center justify-between
        px-5 w-[552px]
      "
    >
      {/* Left side */}
      <div className="flex h-11 items-center justify-between ">
        <button className=''> 
            <ArrowLeftToLine className="h-4 w-4" />
        </button>
      </div>

      {/* Middle side */}
      
      <div className="flex flex-1 justify-center">
        <div className="w-64 md:w-72 lg:w-80 ">
        <SearchBar />
        </div>
      </div>

      {/* Right side */}
      <div className="lex items-center gap-2">
        <button >
            <ChevronsUpDown className="size-4 " />
        </button>
      </div>
    </div>
  );
}
