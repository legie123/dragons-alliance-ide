import { useEffect, useState } from "react";
import { fsList, FsEntry } from "../api";

function Node({
  entry,
  depth,
  activePath,
  onOpen,
}: {
  entry: FsEntry;
  depth: number;
  activePath: string | null;
  onOpen: (e: FsEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FsEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (entry.type === "file") return onOpen(entry);
    const next = !open;
    setOpen(next);
    if (next && children === null) {
      setLoading(true);
      try {
        const r = await fsList(entry.path);
        setChildren(r.entries);
      } catch {
        setChildren([]);
      }
      setLoading(false);
    }
  }

  const icon = entry.type === "dir" ? (open ? "▾" : "▸") : "·";
  const isActive = activePath === entry.path;

  return (
    <div>
      <div
        className={`ft-row${isActive ? " active" : ""}${entry.hidden ? " hidden" : ""}`}
        style={{ paddingLeft: 8 + depth * 13 }}
        onClick={toggle}
        title={entry.name}
      >
        <span className={`ft-ic ${entry.type}`}>{icon}</span>
        <span className="ft-name">{entry.name}</span>
      </div>
      {open && (
        <div>
          {loading && <div className="ft-row dim" style={{ paddingLeft: 8 + (depth + 1) * 13 }}>…</div>}
          {children?.map((c) => (
            <Node key={c.path} entry={c} depth={depth + 1} activePath={activePath} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  root,
  roots,
  activePath,
  onOpen,
}: {
  root: string;
  roots: string[];
  activePath: string | null;
  onOpen: (e: FsEntry) => void;
}) {
  const [cur, setCur] = useState(root);
  const [list, setList] = useState<FsEntry[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setCur(root); }, [root]);
  useEffect(() => {
    let on = true;
    setErr(null);
    fsList(cur)
      .then((r) => { if (on) { setList(r.entries); setParent(r.parent); } })
      .catch((e) => { if (on) { setList([]); setParent(null); setErr(String(e?.message || e) || "cannot open"); } });
    return () => { on = false; };
  }, [cur]);

  return (
    <div className="filetree">
      <div className="ft-roots">
        {roots.map((r) => (
          <button key={r} className={r === cur ? "active" : ""} onClick={() => setCur(r)} title={r}>
            {r.replace(/^\/Users\/[^/]+/, "~").split("/").pop() || "~"}
          </button>
        ))}
      </div>
      <div className="ft-path">{cur.replace(/^\/Users\/[^/]+/, "~")}</div>
      <div className="ft-list">
        {parent && (
          <div className="ft-row up" style={{ paddingLeft: 8 }} onClick={() => setCur(parent)}>
            <span className="ft-ic dir">↑</span><span className="ft-name">..</span>
          </div>
        )}
        {err && <div className="ft-row dim" style={{ paddingLeft: 8 }}>⚠ {err}</div>}
        {!err && list.length === 0 && <div className="ft-row dim" style={{ paddingLeft: 8 }}>empty</div>}
        {list.map((e) => (
          <Node key={e.path} entry={e} depth={0} activePath={activePath} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
