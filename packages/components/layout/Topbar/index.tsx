import ProjectInfo from "./ProjectInfo";
import ProgressBar from "./ProgressBar";
import TopbarActions from "./TopbarActions";

export default function Topbar() {
  const projectName = "NextJS-Project";
  const branch = "Main";
  const progress = 75;

  return (
    <div className="w-full ">
      <div
        // className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8  max-w-7xl gap-45 ml-5"
        className="flex h-18 justify-center items-end shrink-0 self-stretch"
      >
        {/* ซ้าย */}
        <div className="flex flex-1 basis-0 items-center gap-2 self-stretch px-6 py-4">
          <ProjectInfo />
        </div>
        {/* กลาง */}
        <div className="flex flex-1 basis-0 justify-center items-center gap-2 self-stretch px-6 py-4">
          <ProgressBar value={progress} />
        </div>
        {/* ขวา */}
        <div className="flex flex-1 basis-0 justify-end items-center gap-4 self-stretch p-4">
          <TopbarActions />
        </div>
      </div>
    </div>
  );
}
