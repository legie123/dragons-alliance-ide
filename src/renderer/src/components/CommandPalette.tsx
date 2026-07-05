import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IcCommand, IcZap, IcMonitor, IcFolder, IcFile, IcTerminal, IcCrown, IcKey, IcBook, IcSettings, IcChart, IcPlay, IcRefresh } from "./icons";
import { motion, AnimatePresence } from "motion/react";
import { Cmd, paletteCommands, rankCommands } from "../palette";
import { getRecents, pushRecent } from "../paletteRecents";
import { setLastAction } from "../lastAction";
import { OpStatusBadge } from "./da";
import { fsWalk } from "../api";

const CAT_ICON: Record<Cmd["category"], ReactNode> = {
  Action: <IcZap size={13} />, View: <IcMonitor size={13} />, Project: <IcFolder size={13} />,
  Terminal: <IcTerminal size={13} />, File: <IcFile size={13} />,
  Superpower: <IcCrown size={13} />, Admin: <IcKey size={13} />, Help: <IcCommand size={13} />,
  Sector: <IcMonitor size={13} />, Recommended: <IcPlay size={13} />, Recent: <IcRefresh size={13} />,
  Diagnostics: <IcChart size={13} />, Settings: <IcSettings size={13} />, Guide: <IcBook size={13} />,
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
    const ranked = rankCommands(query, all, getRecents());
    if (!query.trim()) return [...ranked, ...files.slice(0, 8)].slice(0, MAX);
    return ranked.slice(0, MAX);
  }, [open, query, files]);

  useEffect(() => { setSel(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  const runCmd = (c: Cmd) => {
    if (c.disabledReason) return; // honest: shows the reason, never dead-runs
    onClose();
    pushRecent(c.id);
    setLastAction(c.title);
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = results[sel]; if (c) runCmd(c); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  // group headers only in the browse (empty-query) view
  const grouped = !query.trim();

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
              placeholder="Jump to a file, command, sector, superpower…" spellCheck={false} />
            <span className="cmdk-hint">esc</span>
          </div>
          <div className="cmdk-list" ref={listRef}>
            {results.length === 0 && <div className="cmdk-empty">no matches</div>}
            {results.map((c, i) => (
              <div key={c.id}>
                {grouped && (i === 0 || results[i - 1].category !== c.category) && (
                  <div className="cmdk-group">{c.category.toUpperCase()}</div>
                )}
                <div data-i={i}
                  className={`cmdk-row${i === sel ? " sel" : ""}${c.disabledReason ? " disabled" : ""}`}
                  aria-disabled={c.disabledReason ? "true" : undefined}
                  title={c.disabledReason}
                  onMouseEnter={() => setSel(i)} onClick={() => runCmd(c)}>
                  <span className="cmdk-ic">{c.icon || CAT_ICON[c.category]}</span>
                  <span className="cmdk-title">{c.title}</span>
                  {c.status && <OpStatusBadge status={c.status} size="sm" />}
                  {(c.disabledReason || c.subtitle) && <span className="cmdk-sub">{c.disabledReason || c.subtitle}</span>}
                  {c.shortcut && <kbd className="cmdk-kbd">{c.shortcut}</kbd>}
                  <span className="cmdk-cat">{c.category}</span>
                </div>
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
