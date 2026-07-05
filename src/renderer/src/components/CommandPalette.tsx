import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IcCommand, IcZap, IcMonitor, IcFolder, IcFile, IcTerminal, IcCrown, IcKey } from "./icons";
import { motion, AnimatePresence } from "motion/react";
import { Cmd, paletteCommands, fuzzyScore } from "../palette";
import { fsWalk } from "../api";

const CAT_ICON: Record<Cmd["category"], ReactNode> = {
  Action: <IcZap size={13} />, View: <IcMonitor size={13} />, Project: <IcFolder size={13} />,
  Terminal: <IcTerminal size={13} />, File: <IcFile size={13} />,
  Superpower: <IcCrown size={13} />, Admin: <IcKey size={13} />, Help: <IcCommand size={13} />,
};
const MAX = 60;

export function CommandPalette({
  open,
  onClose,
  roots,
  onOpenFile,
}: {
  open: boolean;
  onClose: () => void;
  roots: string[];
  onOpenFile: (absPath: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [files, setFiles] = useState<Cmd[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesLoaded = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  // lazily build the file index (once), walking each root
  useEffect(() => {
    if (!open || filesLoaded.current || roots.length === 0) return;
    filesLoaded.current = true;
    (async () => {
      const seen = new Set<string>();
      const cmds: Cmd[] = [];
      for (const root of roots.slice(0, 12)) {
        try {
          const { root: base, files: rel } = await fsWalk(root, 4000);
          for (const r of rel) {
            const abs = `${base}/${r}`;
            if (seen.has(abs)) continue;
            seen.add(abs);
            const name = r.split("/").pop() || r;
            cmds.push({
              id: `file:${abs}`,
              title: name,
              subtitle: r,
              category: "File",
              icon: CAT_ICON.File,
              run: () => onOpenFile(abs),
            });
          }
        } catch { /* skip root */ }
      }
      setFiles(cmds);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roots]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!open) return [];
    const all = [...paletteCommands(), ...files];
    if (!query.trim()) {
      // no query: show actions/views/projects/terminals first, few files
      const nonFile = all.filter((c) => c.category !== "File");
      const someFiles = files.slice(0, 8);
      return [...nonFile, ...someFiles].slice(0, MAX);
    }
    return all
      .map((c) => ({ c, s: Math.max(fuzzyScore(query, c.title) * 1.2, fuzzyScore(query, c.subtitle || "")) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX)
      .map((x) => x.c);
  }, [open, query, files]);

  useEffect(() => { setSel(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = results[sel]; if (c) { onClose(); c.run(); } }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <AnimatePresence>
      <motion.div className="cmdk-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="cmdk" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          <div className="cmdk-input">
            <span className="cmdk-glyph"><IcCommand size={16} /></span>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
              placeholder="Jump to a file, command, project, terminal…" spellCheck={false} />
            <span className="cmdk-hint">esc</span>
          </div>
          <div className="cmdk-list" ref={listRef}>
            {results.length === 0 && <div className="cmdk-empty">no matches</div>}
            {results.map((c, i) => (
              <div key={c.id} data-i={i} className={`cmdk-row${i === sel ? " sel" : ""}`}
                onMouseEnter={() => setSel(i)} onClick={() => { onClose(); c.run(); }}>
                <span className="cmdk-ic">{c.icon || CAT_ICON[c.category]}</span>
                <span className="cmdk-title">{c.title}</span>
                {c.subtitle && <span className="cmdk-sub">{c.subtitle}</span>}
                <span className="cmdk-cat">{c.category}</span>
              </div>
            ))}
          </div>
          <div className="cmdk-foot">
            <span>↑↓ navigate</span><span>⏎ open</span><span>⌘K toggle</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
