// Bundle Monaco + its language workers locally (offline-safe, full features).
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import { loader } from "@monaco-editor/react";

(self as any).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

// custom dark theme matching the IDE
monaco.editor.defineTheme("claude-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#0a0c12",
    "editor.foreground": "#dbe2f0",
    "editorLineNumber.foreground": "#3a4256",
    "editor.selectionBackground": "#2a3350",
    "editor.lineHighlightBackground": "#11151f",
    "editorCursor.foreground": "#7c8cff",
    "editorIndentGuide.background1": "#1a1f2e",
  },
});

export default monaco;
