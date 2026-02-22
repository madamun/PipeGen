// src/components/layout/RightPanel/EditorBody.tsx

"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Editor, { DiffEditor, OnMount } from "@monaco-editor/react";
import { usePipeline } from "../../workspace/PipelineProvider";
import { validateYaml, type YamlValidationError } from "../../../lib/pipelineEngine";
import { Loader2, AlertCircle } from "lucide-react";

interface EditorBodyProps {
  fontSize: number;
  isDiffMode: boolean;
}

export default function EditorBody({ fontSize, isDiffMode }: EditorBodyProps) {
  const {
    fileContent,
    setFileContent,
    selectedFile,
    originalContent,
    selectedBranch,
  } = usePipeline();

  const safeContent = typeof fileContent === "string" ? fileContent : "";
  const safeOriginal =
    typeof originalContent === "string" ? originalContent : "";

  const [doc, setDoc] = useState(safeContent);
  const [isMounting, setIsMounting] = useState(true);
  const [editorErrors, setEditorErrors] = useState<YamlValidationError[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  useEffect(() => {
    if (safeContent !== doc) {
      setDoc(safeContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeContent, selectedFile]);

  useEffect(() => {
    setEditorErrors([]);
  }, [selectedFile]);

  useEffect(() => {
    if (isDiffMode) return;
    const t = setTimeout(() => setEditorErrors(validateYaml(doc)), 300);
    return () => clearTimeout(t);
  }, [doc, isDiffMode]);

  useEffect(() => {
    if (isDiffMode || !monacoRef.current || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const monaco = monacoRef.current;
    const markers = editorErrors.map((e) => ({
      startLineNumber: e.line,
      startColumn: e.column,
      endLineNumber: e.line,
      endColumn: Math.max(e.column, 1) + 20,
      severity: monaco.MarkerSeverity.Error,
      message: e.message,
    }));
    monaco.editor.setModelMarkers(model, "yaml-validate", markers);
    return () => {
      monaco.editor.setModelMarkers(model, "yaml-validate", []);
    };
  }, [editorErrors, isDiffMode]);

  const handleEditorChange = (value: string | undefined) => {
    const val = value || "";
    if (val === safeContent) return;
    setDoc(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFileContent(val);
    }, 500);
  };

  const goToLine = useCallback((line: number, column: number) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: Math.max(1, column) });
    ed.focus();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    setIsMounting(false);
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!isDiffMode) setFileContent(editor.getValue());
    });
  };

  const handleDiffMount = (editor: { updateOptions: (opts: Record<string, unknown>) => void; layout: () => void }) => {
    setIsMounting(false);
    setTimeout(() => {
      editor.updateOptions({
        enableSplitViewResizing: false,
        renderSideBySide: true,
        originalEditable: false,
        minimap: { enabled: false },
        renderOverviewRuler: false,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: "auto",
          verticalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false,
        },
        readOnly: true,
        scrollBeyondLastLine: false,
        fontFamily: "'JetBrains Mono', monospace",
        diffWordWrap: "off",
        lineNumbersMinChars: 3,
        automaticLayout: true,
      });
      editor.layout();
    }, 50);
  };

  if (!selectedFile) {
    return (
      <div className="h-full w-full bg-[#1e1e1e] flex flex-col items-center justify-center text-slate-500 select-none">
        <div className="text-4xl mb-4 opacity-30 grayscale">🚀</div>
        <p className="text-sm font-medium">No file selected</p>
      </div>
    );
  }

  const LoadingOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] z-20">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-blue-500 h-6 w-6" />
        <span className="text-xs text-slate-500">Loading Editor...</span>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#010819] relative flex flex-col">
      {isDiffMode && (
        <style jsx global>{`
          .monaco-diff-editor .monaco-sash {
            pointer-events: none !important;
            width: 0px !important;
            background: transparent !important;
          }
          .monaco-diff-editor .diagonal-fill {
            background-image: none !important;
            background-color: #0f1e30 !important;
          }
          .monaco-diff-editor .editor.modified {
            box-shadow: none !important;
          }
          .monaco-scrollable-element > .scrollbar > .slider {
            background: rgba(255, 255, 255, 0.1) !important;
            border-radius: 4px;
          }
        `}</style>
      )}

      {isDiffMode && (
        <div className="grid grid-cols-2 h-9 border-b border-white/10 text-xs font-mono select-none z-10 shrink-0">
          <div className="flex items-center justify-center px-4 text-slate-400 bg-[#0f1e30] border-r border-white/10">
            <span className="opacity-70">Older Version (Git)</span>
          </div>
          <div className="flex items-center justify-center px-4 text-white bg-blue-600 border-l border-white/5">
            <div className="flex items-center gap-2">
              <span>{selectedBranch || "Current"} (Modified)</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {isMounting && <LoadingOverlay />}
          {isDiffMode ? (
          <DiffEditor
            height="100%"
            theme="vs-dark"
            original={safeOriginal}
            modified={doc}
            onMount={handleDiffMount}
            options={{
              fontSize: fontSize,
              readOnly: true,
              renderSideBySide: true,
              enableSplitViewResizing: false,
              useInlineViewWhenSpaceIsLimited: false,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              fontFamily: "'JetBrains Mono', monospace",
              diffWordWrap: "off",
            }}
          />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="yaml"
            path={selectedFile}
            theme="vs-dark"
            value={doc}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: fontSize,
              minimap: { enabled: true },
              fontFamily: "'JetBrains Mono', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
            }}
          />
        )}
        </div>
        {!isDiffMode && editorErrors.length > 0 && (
          <div className="shrink-0 border-t border-white/10 bg-[#0f1e30] max-h-36 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-400 border-b border-white/5 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              YAML errors
            </div>
            <ul className="p-1 list-none">
              {editorErrors.map((err, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goToLine(err.line, err.column)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-200 hover:bg-white/10 cursor-pointer focus:outline-none focus:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 font-mono"
                  >
                    <span className="text-red-400">Line {err.line}</span>
                    {err.column > 1 && <span className="text-slate-500">:{err.column}</span>}
                    {" "}{err.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
