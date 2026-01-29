import Topbar from "@/components/layout/Topbar";
import Workspace from "@/components/workspace/Workspace";
import { PipelineProvider } from "@/components/workspace/PipelineProvider";

export default function Page() {
  return (
    <>
    <PipelineProvider>
      <Topbar />
      {/* <div className="flex gap-6 p-6"> 
        
      </div> */}
      <Workspace />
      </PipelineProvider>
    </>
  );
}
