"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Trash2 } from "lucide-react";

interface DiscardDraftDialogProps {
  open: boolean;
  fileName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DiscardDraftDialog({ open, fileName, onConfirm, onClose }: DiscardDraftDialogProps) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => { if (!next) onClose(); },
    [onClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[10%] translate-y-0 !max-w-[400px] border border-red-500/30 text-slate-50 bg-[radial-gradient(121.01%_173%_at_50%_173%,#5184FB_0%,#0437AE_40.15%,#02184B_100%)] p-5 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            Discard Draft
          </DialogTitle>
          <DialogDescription className="text-sm text-[#B4CAFD] mt-1">
            Are you sure you want to discard this draft? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-black/20 border border-white/10 rounded-lg p-3 mt-2 font-mono text-xs text-red-300">
          {fileName}
        </div>

        <div className="flex gap-2 pt-3">
          <Button
            variant="secondary"
            className="flex-1 border border-white/30 text-white bg-transparent hover:bg-white/10 rounded-lg py-2"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg py-2"
            onClick={onConfirm}
          >
            <Trash2 className="h-4 w-4" />
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}