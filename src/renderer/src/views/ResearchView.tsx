// Research — the vault's research library, live. Reads real notes from
// 07_RESEARCH in the Obsidian brain (fs.walk + fs.read over the existing fs IPC —
// HOME-confined), full-text search, frontmatter + markdown preview. Every note
// here is also a node in Neuromap (research lens). Replaces the earlier
// untrusted-external-tool scaffold with data we already own.
import { useEffect, useMemo, useState } from "react";
import { IcSearch } from "../components/icons";
import { useQuery } from "@tanstack/react-query";

const RESEARCH_DIR = "Documents/Obsidian/Antigravity-Brain/07_RESEARCH";

type Note = { path: string; name: string; title: string; tags: string[]; created: string; body: string };

function parseFm(raw: string): { title?: string; tags: string[]; created?: string; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { tags: [], body: raw };
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  const tags = (fm.tags?.match(/\[([^\]]*)\]/)?.[1] || "")
    .split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return { title: fm.title?.replace(/^["']|["']$/g, ""), tags, created: fm.created, body: raw.slice(m[0].length) };
}

async function loadNotes(): Promise<Note[]> {
  const home = (await window.dai.host.info()).home;
  const root = `${home}/${RESEARCH_DIR}`;
  const { files } = await window.dai.fs.walk(root, 400);
  const mds = files.filter((f) => f.endsWith(".md"));
  const notes = await Promise.all(mds.map(async (rel): Promise<Note | null> => {
    try {
      const raw = await window.dai.fs.read(`${root}/${rel}`);
      const { title, tags, created, body } = parseFm(raw);
      const name = rel.split("/").pop()!.replace(/\.md$/, "");
      return { path: `${root}/${rel}`, name, title: title || name, tags, created: created || "", body };
    } catch { return null; }
  }));
  return notes.filter((n): n is Note => !!n)
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}

export function ResearchView() {
  const { data: notes = [], refetch, isFetching } = useQuery({ queryKey: ["research"], queryFn: loadNotes, refetchInterval: 20000 });
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const hits = useMemo(() => {
    if (!q.trim()) return notes;
    const needle = q.toLowerCase();
    return notes.filter((n) =>
      n.title.toLowerCase().includes(needle) ||
      n.tags.some((t) => t.toLowerCase().includes(needle)) ||
      n.body.toLowerCase().includes(needle));
  }, [notes, q]);

  const open = useMemo(() => notes.find((n) => n.path === sel) || null, [notes, sel]);
  useEffect(() => { if (sel && !open) setSel(null); }, [sel, open]);

  return (
    <div className="rs-view">
      <div className="rs-bar">
        <span className="rs-title"><IcSearch /> RESEARCH</span>
        <span className="rs-tool">07_RESEARCH · Antigravity-Brain</span>
        <span className="rs-status live">● {notes.length} notes{isFetching ? " · scanning…" : ""}</span>
        <input className="rs-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search title, tag, content…" spellCheck={false} />
        <button className="rs-go" onClick={() => refetch()}>⟳</button>
      </div>

      <div className="rs-body">
        <div className="rs-list">
          {hits.length === 0 && <div className="rs-empty">{q ? "no matches" : "no research notes yet — findings land here from every session"}</div>}
          {hits.map((n) => (
            <button key={n.path} className={`rs-note${sel === n.path ? " sel" : ""}`} onClick={() => setSel(n.path)}>
              <div className="rs-note-title">{n.title}</div>
              <div className="rs-note-meta">
                {n.created && <span className="rs-note-date">{n.created}</span>}
                {n.tags.slice(0, 4).map((t) => <span key={t} className="rs-tag">{t}</span>)}
              </div>
            </button>
          ))}
        </div>

        {open ? (
          <article className="rs-reader">
            <div className="rs-reader-head">
              <span className="rs-reader-title">{open.title}</span>
              <span className="rs-reader-tags">{open.tags.map((t) => <span key={t} className="rs-tag">{t}</span>)}</span>
            </div>
            <pre className="rs-reader-body">{open.body.trim().slice(0, 60000)}</pre>
          </article>
        ) : (
          <div className="rs-hint">Pick a note — full markdown + frontmatter. These same notes are the teal research nodes in 🧠 Neuromap.</div>
        )}
      </div>
    </div>
  );
}
