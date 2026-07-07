import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import "../monaco-setup";
import { useQuery } from "@tanstack/react-query";
import { fetchHost, fetchProjects, fsRead, fsWrite, langFromPath, FsEntry } from "../api";
import { FileTree } from "../components/FileTree";
import { IcCode, IcBranch, IcX } from "../components/icons";
import { pushToast } from "../toast";

type OpenFile = { path: string; name: string; content: string; dirty: boolean; lang: string };
type OpenSignal = { path: string; n: number } | null;

export function CodeView({ openFile }: { openFile?: OpenSignal }) {
  const { data: host } = useQuery({ queryKey: ["host"], queryFn: fetchHost, refetchInterval: false });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects, refetchInterval: 8000 });
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const editorRef = useRef<any>(null);

  const active = files.find((f) => f.path === activePath) || null;

  // engineering signal: repo of the active file → branch badge + diff count (real git state)
  const repo = (() => {
    if (!activePath) return null;
    let best: (typeof projects)[number] | null = null;
    for (const p of projects) {
      if (p.branch && (activePath === p.path || activePath.startsWith(p.path + "/")) && (!best || p.path.length > best.path.length)) best = p;
    }
    return best;
  })();

  // honest gating for the action bar: read the repo's real package.json scripts.
  // null = no package.json (or unparseable); undefined = still reading.
  const { data: pkgScripts } = useQuery({
    queryKey: ["pkg-scripts", repo?.path],
    enabled: !!repo,
    queryFn: async (): Promise<Record<string, string> | null> => {
      try {
        return (JSON.parse(await fsRead(repo!.path + "/package.json")).scripts ?? {}) as Record<string, string>;
      } catch {
        return null;
      }
    },
  });
  const gateTitle = (ok: boolean, cmd: string, missing: string) =>
    ok ? cmd : pkgScripts === null ? "no package.json in repo" : pkgScripts === undefined ? "reading package.json…" : missing;

  // arm a real command in a fresh shell terminal at the repo root, then jump to Terminals
  function armIn(typed: string) {
    if (!repo) return;
    const id = "code" + Date.now().toString(36);
    window.dai.term.create({ id, cmd: "shell", cwd: repo.path });
    setTimeout(() => window.dai.term.write(id, typed + "\n"), 1200);
    window.dai.audit.log("code-action", typed + " @ " + repo.name);
    pushToast({ kind: "info", title: typed, detail: "in " + repo.name, ttl: 3500 });
    window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
  }

  function askAgent() {
    if (!repo || !active) return;
    const id = "code" + Date.now().toString(36);
    window.dai.term.create({ id, cmd: "claude", cwd: repo.path });
    setTimeout(() => window.dai.term.write(id, "Review " + active.path + " for correctness and propose a minimal fix."), 1800);
    window.dai.audit.log("code-action", "ask-agent " + active.path + " @ " + repo.name);
    pushToast({ kind: "info", title: "Ask agent", detail: "reviewing " + active.name, ttl: 3500 });
    window.dispatchEvent(new CustomEvent("dai:goto", { detail: "ide" }));
  }

  async function openPath(path: string) {
    if (files.some((f) => f.path === path)) { setActivePath(path); return; }
    try {
      const content = await fsRead(path);
      setFiles((p) => [...p, { path, name: path.split("/").pop() || path, content, dirty: false, lang: langFromPath(path) }]);
      setActivePath(path);
    } catch (err: any) {
      flash(`✗ ${err.message}`);
    }
  }
  async function open(e: FsEntry) {
    if (e.type !== "file") return;
    openPath(e.path);
  }

  // open the file the ⌘K palette (or App) requested
  useEffect(() => {
    if (openFile?.path) openPath(openFile.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFile?.n]);

  function closeFile(path: string) {
    setFiles((p) => p.filter((f) => f.path !== path));
    setActivePath((a) => (a === path ? files.filter((f) => f.path !== path).slice(-1)[0]?.path ?? null : a));
  }

  function onChange(val: string | undefined) {
    setFiles((p) => p.map((f) => (f.path === activePath ? { ...f, content: val ?? "", dirty: true } : f)));
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      await fsWrite(active.path, active.content);
      setFiles((p) => p.map((f) => (f.path === active.path ? { ...f, dirty: false } : f)));
      flash(`✓ saved ${active.name}`);
    } catch (err: any) {
      flash(`✗ ${err.message}`);
    }
    setSaving(false);
  }

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 1900); }

  // Cmd/Ctrl+S + right-rail "Save File" (dai:sector-action code:save)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
    };
    const act = (e: Event) => { if ((e as CustomEvent).detail === "code:save") save(); };
    window.addEventListener("keydown", h);
    window.addEventListener("dai:sector-action", act);
    return () => { window.removeEventListener("keydown", h); window.removeEventListener("dai:sector-action", act); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const roots = host ? [host.home, ...host.projects.filter((p) => p !== host.home)] : [];

  return (
    <div className="code-view">
      <aside className="code-sidebar">
        {host && <FileTree root={host.home} roots={roots} activePath={activePath} onOpen={open} />}
      </aside>
      <main className="code-main">
        <div className="code-tabs">
          {files.length === 0 && <span className="code-hint">select a file from the tree →</span>}
          {files.map((f) => (
            <div key={f.path} className={`code-tab${f.path === activePath ? " active" : ""}`} onClick={() => setActivePath(f.path)}>
              <span className="ct-name">{f.name}</span>
              {f.dirty && <span className="ct-dot" />}
              <span className="ct-x" role="button" aria-label={`Close ${f.name}`} onClick={(e) => { e.stopPropagation(); closeFile(f.path); }}><IcX size={10} /></span>
            </div>
          ))}
          <div className="code-spacer" />
          {repo && (
            <span className="code-repo" title={`${repo.name} — branch ${repo.branch}${repo.dirty ? ` · ${repo.dirty} changed files` : " · clean"}`}>
              <IcBranch size={13} /> {repo.branch}
              {repo.dirty > 0 ? <b className="code-diff">±{repo.dirty}</b> : <i className="code-clean">clean</i>}
            </span>
          )}
          {repo && (
            <>
              <button className="da-btn ghost sm" disabled={!pkgScripts?.build} title={gateTitle(!!pkgScripts?.build, "npm run build", "no build script in package.json")} onClick={() => armIn("npm run build")}>Build</button>
              <button className="da-btn ghost sm" title="npx tsc --noEmit" onClick={() => armIn("npx tsc --noEmit")}>Typecheck</button>
              <button className="da-btn ghost sm" disabled={!pkgScripts?.test} title={gateTitle(!!pkgScripts?.test, "npm test", "no test script in package.json")} onClick={() => armIn("npm test")}>Tests</button>
              <button className="da-btn ghost sm" title="git diff" onClick={() => armIn("git diff")}>Git Diff</button>
              <button className="da-btn ghost sm" disabled={!active} title={active ? "Claude reviews " + active.name : "open a file to review"} onClick={askAgent}>Ask agent</button>
            </>
          )}
          {active && (
            <button className={`savebtn${active.dirty ? " dirty" : ""}`} disabled={saving || !active.dirty} onClick={save}>
              {saving ? "saving…" : active.dirty ? "⌘S Save" : "Saved"}
            </button>
          )}
          {toast && <span className="code-toast">{toast}</span>}
        </div>
        <div className="code-editor">
          {active ? (
            <Editor
              key={active.path}
              theme="claude-dark"
              language={active.lang}
              value={active.content}
              onChange={onChange}
              onMount={(ed) => { editorRef.current = ed; }}
              options={{
                fontSize: 13,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                minimap: { enabled: true },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "off",
                bracketPairColorization: { enabled: true },
                cursorBlinking: "smooth",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                renderWhitespace: "selection",
              }}
            />
          ) : (
            <div className="code-empty"><IcCode /> open a file to start editing</div>
          )}
        </div>
      </main>
    </div>
  );
}
