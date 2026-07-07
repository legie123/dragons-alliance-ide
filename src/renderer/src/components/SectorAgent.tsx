// SECTOR AGENT — the platform's first REAL end-to-end chat (v4 dominant objective).
// One contextual agent per sector, answered by the LOCAL Ollama server (Hermes
// model preferred) via window.dai.llm.chat — no cloud, no API keys. Honest by
// construction: if Ollama is down the panel says SETUP_REQUIRED with the real
// fix; every reply is the model's actual output; failures render their true
// reason in-chat. Quick actions are REAL routes (registry factories), never fake.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { goto, godmode, admin, openSuperpower, openLibraryGuide, openLibraryTools, runHealthSweep, openPalette } from "../registry";
import { pushToast } from "../toast";
import { OpStatusBadge } from "./da";
import { IcBot, IcZap, IcLock } from "./icons";
import type { LlmChatMsg } from "@shared/ipc";

export type AgentSector =
  | "ide" | "agents" | "code" | "neuromap" | "drive" | "metrics" | "preview" | "creative" | "guide";

const SECTOR_META: Record<AgentSector, { title: string; sys: string; quick: { label: string; run: () => void }[] }> = {
  ide: {
    title: "Terminal",
    sys: "You are the Terminal sector agent of Dragons Alliance IDE. Help with terminal workers (master mirrors to workers), broadcast (real keystrokes, confirmed), CLI sessions (claude/ollama/hermes/codex), and status words: running=active now, idle=ready not error, done, error=real failure. Be concrete and short.",
    quick: [
      { label: "Open Terminal Workers", run: goto("ide") },
      { label: "Run Health Check", run: runHealthSweep },
      { label: "Open Logs", run: admin("audit") },
    ],
  },
  agents: {
    title: "Agents",
    sys: "You are the Agents sector agent of Dragons Alliance IDE. Help with mission control: launch Claude agents into projects, broadcast a prompt to all live agents (confirmed), per-agent Stop (exact terminal match), health badges, transcripts. 0 live agents = nothing running, not an error. Short, concrete answers.",
    quick: [
      { label: "Open Mission Control", run: goto("agents") },
      { label: "Open RuFlo Panel", run: () => openSuperpower("ruflo") },
      { label: "Open Swarm Map", run: goto("neuromap") },
    ],
  },
  code: {
    title: "Code",
    sys: "You are the Code sector agent of Dragons Alliance IDE. Help with the Monaco editor, file tree, ⌘S save, the action bar (Build/Typecheck/Tests arm real terminals in the file's repo; Tests disabled when package.json has no test script), git branch badge, and 'Ask agent' which arms a Claude review terminal. Short, concrete.",
    quick: [
      { label: "Open Code", run: goto("code") },
      { label: "Open Terminal", run: goto("ide") },
      { label: "Command Palette", run: openPalette },
    ],
  },
  neuromap: {
    title: "Neuromap",
    sys: "You are the Neuromap sector agent of Dragons Alliance IDE. Help navigate the living knowledge graph of the Obsidian vault: layers, view modes, time filters, smart labels, search, the Diag panel (real node/edge counts), and the node inspector (frontmatter + backlinks). Graphify generates the digest behind it. Short, concrete.",
    quick: [
      { label: "Open Neuromap", run: goto("neuromap") },
      { label: "Open Graphify Panel", run: () => openSuperpower("graphify") },
      { label: "Open Vault (Obsidian)", run: () => openSuperpower("obsidian") },
    ],
  },
  drive: {
    title: "Drive",
    sys: "You are the Drive sector agent of Dragons Alliance IDE. Help with Google Drive/Sheets/Forms/Mail ops (honest gate until the user signs in with their own OAuth — nothing simulated), the Proton bridge probe, candidates, and the Obsidian vault connection. Short, concrete.",
    quick: [
      { label: "Open Drive", run: goto("drive") },
      { label: "Google Sign-in / Setup", run: () => openSuperpower("google") },
      { label: "Sync Vault", run: () => openSuperpower("obsidian") },
    ],
  },
  metrics: {
    title: "Metrics",
    sys: "You are the Metrics sector agent of Dragons Alliance IDE. Explain the real session metrics (score, context, output tokens, capacity with honest overflow flag), the system-health strip (superpowers live count, ruflo/graphify probe state), and that every figure is probe-derived — a low number is truth, not decoration. Short, concrete.",
    quick: [
      { label: "Open Metrics", run: goto("metrics") },
      { label: "Full System Check (GODMODE)", run: godmode },
      { label: "Run Health Check", run: runHealthSweep },
    ],
  },
  preview: {
    title: "Preview",
    sys: "You are the Preview sector agent of Dragons Alliance IDE. Help with live preview: Neo browser over CDP (click/scroll in the real frame), iframe mode, detected browsers (real /Applications scan) with login-safe open — the user signs in manually, the IDE never touches credentials. Short, concrete.",
    quick: [
      { label: "Open Preview", run: goto("preview") },
      { label: "Open Terminal", run: goto("ide") },
    ],
  },
  creative: {
    title: "Creative",
    sys: "You are the Creative sector agent of Dragons Alliance IDE. Help with the creative framework: image/video platform slots are SETUP_REQUIRED until a real API key is saved in Settings ▸ API Power Center — no key, no fake output, ever. Recommend workflows honestly. Short, concrete.",
    quick: [
      { label: "Open Creative", run: goto("creative") },
      { label: "API Power Center", run: admin("powercenter") },
    ],
  },
  guide: {
    title: "Guide",
    sys: "You are the Guide agent of Dragons Alliance IDE — a premium local-first AI operations IDE. Facts: 8 superpowers in the dock (GODMODE command center, RuFlo workflow engine, Agents swarm, Claude sessions, Graphify graph engine, Obsidian vault, Google APIs, LLM Hub local+API models); 8 sectors (Terminal ⌘1, Agents ⌘2, Code ⌘3, Neuromap ⌘4, Drive ⌘5, Metrics ⌘6, Preview ⌘7, Creative ⌘8); Admin Command Center (Control Room, Tools, Quick Guide, Reference); ⌘K palette. Doctrine: every button is real or honestly disabled with a reason; statuses come from real probes. Answer usage questions concretely and briefly; suggest the exact button/panel to press.",
    quick: [
      { label: "Start Tour", run: () => { /* replaced at runtime */ } },
      { label: "Explain Superpowers", run: openLibraryGuide },
      { label: "Open Tools", run: openLibraryTools },
      { label: "Troubleshoot Buttons", run: openLibraryGuide },
    ],
  },
};

const TOUR: { view: string; title: string; detail: string }[] = [
  { view: "ide", title: "1/8 Terminal", detail: "persistent workers · master mirrors · broadcast" },
  { view: "agents", title: "2/8 Agents", detail: "mission control · launch · stop · transcripts" },
  { view: "code", title: "3/8 Code", detail: "Monaco + real Build/Typecheck action bar" },
  { view: "neuromap", title: "4/8 Neuromap", detail: "the living knowledge graph" },
  { view: "drive", title: "5/8 Drive", detail: "Google ops — honest gate until sign-in" },
  { view: "metrics", title: "6/8 Metrics", detail: "real session + system health metrics" },
  { view: "preview", title: "7/8 Preview", detail: "Neo CDP + detected browsers" },
  { view: "creative", title: "8/8 Creative", detail: "image/video framework — keys in Power Center" },
];

type Line = { role: "user" | "assistant" | "err"; text: string };

export function SectorAgent({ open, sector, onClose }: { open: boolean; sector: AgentSector; onClose: () => void }) {
  const meta = SECTOR_META[sector] ?? SECTOR_META.guide;
  const { data: hub } = useQuery({ queryKey: ["llm-status"], queryFn: () => window.dai.llm.status(), enabled: open, refetchInterval: 12000 });
  const ollama = hub?.providers.find((p) => p.id === "ollama");
  const model = hub?.providers.find((p) => p.id === "hermes-local")?.models[0] ?? ollama?.models[0] ?? "";
  const ready = ollama?.state === "active" && !!model;

  const [log, setLog] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const histRef = useRef<LlmChatMsg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // fresh conversation per open+sector; Guide opens with its signature question
  useEffect(() => {
    if (!open) return;
    histRef.current = [];
    setLog(sector === "guide"
      ? [{ role: "assistant", text: "Vrei tur rapid sau ai o întrebare concretă?" }]
      : [{ role: "assistant", text: `${meta.title} agent ready — ask about this sector, or use a quick action below.` }]);
  }, [open, sector]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9 }); }, [log]);

  async function send(text?: string) {
    const t = (text ?? q).trim();
    if (!t || busy || !ready) return;
    setQ("");
    setLog((l) => [...l, { role: "user", text: t }]);
    setBusy(true);
    try {
      const msgs: LlmChatMsg[] = [{ role: "system", content: meta.sys }, ...histRef.current, { role: "user", content: t }];
      const r = await window.dai.llm.chat(model, msgs);
      if (r.ok) {
        histRef.current = ([...histRef.current, { role: "user", content: t }, { role: "assistant", content: r.text }] as LlmChatMsg[]).slice(-12);
        setLog((l) => [...l, { role: "assistant", text: r.text }]);
      } else {
        setLog((l) => [...l, { role: "err", text: `model error: ${r.error ?? "unknown"}` }]);
      }
    } catch (e) {
      setLog((l) => [...l, { role: "err", text: String(e).slice(0, 160) }]);
    }
    setBusy(false);
  }

  function startTour() {
    onClose();
    pushToast({ kind: "info", title: "Dragon tour — 8 sectors", detail: "watch the decks change", ttl: 2500 });
    TOUR.forEach((s, i) => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("dai:goto", { detail: s.view }));
        pushToast({ kind: "info", title: s.title, detail: s.detail, ttl: 1700 });
      }, 400 + i * 1900);
    });
    window.dai.audit.log("guide-tour", "8-sector tour started");
  }

  if (!open) return null;
  const quick = sector === "guide"
    ? [{ label: "Start Tour", run: startTour }, ...meta.quick.slice(1)]
    : meta.quick;

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="sga" role="dialog" aria-label={`${meta.title} sector agent`} onClick={(e) => e.stopPropagation()}>
        <div className="sga-head">
          <span className="sga-ic"><IcBot size={18} /></span>
          <div className="sga-title-wrap">
            <div className="sga-title">Sector Agent · {meta.title}</div>
            <div className="sga-sub">{ready ? `local model: ${model}` : "local model unavailable"}</div>
          </div>
          <span className="sga-badge"><OpStatusBadge status={ready ? "live" : "setup-required"} size="sm" /></span>
          <button className="gm-x" onClick={onClose} title="close (esc)">esc</button>
        </div>

        {!ready ? (
          <div className="sga-setup">
            <IcLock size={20} />
            <p><b>Ollama isn't answering on 127.0.0.1:11434.</b><br />
              Start the local server (<code>ollama serve</code>) or pull a model (<code>ollama pull hermes3</code>), then reopen.
              Everything here runs locally — no API keys needed.</p>
            <button className="da-btn ghost sm" onClick={() => { openSuperpower("llmhub"); onClose(); }}><IcZap size={12} /> Open LLM Hub</button>
          </div>
        ) : (
          <>
            <div className="sga-body" ref={bodyRef}>
              {log.map((m, i) => (
                <div key={i} className={`sga-line sga-${m.role}`}>{m.text}</div>
              ))}
              {busy && <div className="sga-line sga-assistant sga-busy">thinking…</div>}
            </div>
            <div className="sga-quick">
              {quick.map((a) => (
                <button key={a.label} className="da-btn ghost sm" onClick={() => { a.run(); if (a.label !== "Start Tour") onClose(); }}>{a.label}</button>
              ))}
            </div>
            <div className="sga-in">
              <input value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder={sector === "guide" ? "întreabă orice despre platformă…" : `ask the ${meta.title} agent…`} />
              <button className="da-btn gold sm" disabled={busy || !q.trim()} onClick={() => send()}>Send</button>
            </div>
          </>
        )}
        <div className="sga-foot">local Ollama chat — no cloud, no keys · answers are the model's real output</div>
      </div>
    </div>
  );
}
