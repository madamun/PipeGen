"use client";

import * as React from "react";
import { AlertTriangle, FileText, FolderOpen, RefreshCw, Sparkles } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

interface AutoSetupDialogProps {
    open: boolean;
    files: string[];
    onChoice: (choice: "overwrite" | "open") => void;
    onClose: () => void;
}

export default function AutoSetupDialog({ open, files, onChoice, onClose }: AutoSetupDialogProps) {

    const handleOpenChange = React.useCallback(
        (next: boolean) => {
            if (!next) onClose();
        },
        [onClose]
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="top-[15%] translate-y-0 max-w-[28rem] w-full border border-[#B4CAFD] text-slate-50 
  bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)] p-6 shadow-2xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2 ">
                        <AlertTriangle className="h-5 w-5 text-white" />
                        Existing Pipeline Found
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#B4CAFD] mt-2">
                        This repository already has CI/CD pipeline files:
                    </DialogDescription>
                </DialogHeader>

                {/* รายชื่อไฟล์ */}
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 mb-1 space-y-2 font-mono text-xs max-h-32 overflow-y-auto custom-scrollbar">
                    {files.map(f => (
                        <div key={f} className="flex items-center gap-2 text-green-300">
                            <FileText size={14} className="shrink-0 opacity-80" />
                            <span className="truncate">{f}</span>
                        </div>
                    ))}
                </div>

                <p className="text-sm text-[#B4CAFD]  mt-1">
                    What would you like to do?
                </p>

                <div className="flex flex-col gap-2 pt-1">

                    <Button
                        className="w-full flex items-center justify-center gap-2 border border-white/40 bg-transparent hover:bg-white/10 text-white rounded-lg py-2"
                        onClick={() => onChoice("open")}
                    >
                        <FolderOpen className="h-4 w-4" />
                        Open existing pipeline to edit
                    </Button>

                    <Button
                        className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2f6ad6] text-white rounded-lg py-2 shadow-md shadow-blue-500/20 transition-all"
                        onClick={() => onChoice("overwrite")}
                    >
                        <Sparkles className="h-4 w-4" />
                        Create new pipeline (overwrite)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}