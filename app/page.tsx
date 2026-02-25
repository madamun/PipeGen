import Topbar from "../packages/components/layout/Topbar";
import Workspace from "../packages/components/workspace/Workspace";

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <Topbar />
      <Workspace />
   </main> 
  );
}
