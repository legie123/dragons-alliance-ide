// SECTOR AGENT CORE — shared brain for the per-sector native agent windows and
// the Dragon Guide's embedded chat. Answered by the LOCAL Ollama server (Hermes
// preferred) via window.dai.llm.chat — no cloud, no keys. Honest by construction:
// Ollama down → the consumers render SETUP_REQUIRED with the true fix; every
// reply is the model's real output; failures surface their true reason in-chat.
// Conversations persist per sector for the session (module memory), so collapsing
// the window or switching decks never loses the thread.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { goto, godmode, admin, openSuperpower, openLibraryGuide, openLibraryTools, runHealthSweep, openPalette } from "../registry";
import { pushToast } from "../toast";
import type { LlmChatMsg } from "@shared/ipc";

export type AgentSector =
  | "ide" | "agents" | "code" | "neuromap" | "drive" | "metrics" | "preview" | "creative" | "guide";

export type ChatLine = { role: "user" | "assistant" | "err"; text: string };

export const SECTOR_META: Record<AgentSector, { title: string; sys: string; quick: { label: string; run: () => void }[] }> = {
  ide: {
    title: "Terminal",
    sys: "You are the Terminal sector agent of Dragons Alliance IDE. Help with terminal workers (master mirrors to workers), broadcast (real keystrokes, confirmed), CLI sessions (claude/ollama/hermes/codex), and status words: running=active now, idle=ready not error, done, error=real failure. Be concrete and short.",
    quick: [
      { label: "Health Check", run: runHealthSweep },
      { label: "Logs", run: admin("audit") },
    ],
  },
  agents: {
    title: "Agents",
    sys: "You are the Agents sector agent of Dragons Alliance IDE. Help with mission control: launch Claude agents into projects, broadcast a prompt to all live agents (confirmed), per-agent Stop (exact terminal match), health badges, transcripts. 0 live agents = nothing running, not an error. Short, concrete answers.",
    quick: [
      { label: "RuFlo Panel", run: () => openSuperpower("ruflo") },
      { label: "Swarm Map", run: goto("neuromap") },
    ],
  },
  code: {
    title: "Code",
    sys: "You are the Code sector agent of Dragons Alliance IDE. Help with the Monaco editor, file tree, ⌘S save, the action bar (Build/Typecheck/Tests arm real terminals in the file's repo; Tests disabled when package.json has no test script), git branch badge, and 'Ask agent' which arms a Claude review terminal. Short, concrete.",
    quick: [
      { label: "Terminal", run: goto("ide") },
      { label: "Palette ⌘K", run: openPalette },
    ],
  },
  neuromap: {
    title: "Neuromap",
    sys: "You are the Neuromap sector agent of Dragons Alliance IDE. Help navigate the living knowledge graph of the Obsidian vault: layers, view modes, time filters, smart labels, search, the Diag panel (real node/edge counts), and the node inspector (frontmatter + backlinks). Graphify generates the digest behind it. Short, concrete.",
    quick: [
      { label: "Graphify Panel", run: () => openSuperpower("graphify") },
      { label: "Open Vault", run: () => openSuperpower("obsidian") },
    ],
  },
  drive: {
    title: "Drive",
    sys: "You are the Drive sector agent of Dragons Alliance IDE. Help with Google Drive/Sheets/Forms/Mail ops (honest gate until the user signs in with their own OAuth — nothing simulated), the Proton bridge probe, candidates, and the Obsidian vault connection. Short, concrete.",
    quick: [
      { label: "Google Setup", run: () => openSuperpower("google") },
      { label: "Sync Vault", run: () => openSuperpower("obsidian") },
    ],
  },
  metrics: {
    title: "Metrics",
    sys: "You are the Metrics sector agent of Dragons Alliance IDE. Explain the real session metrics (score, context, output tokens, capacity with honest overflow flag), the system-health strip (superpowers live count, ruflo/graphify probe state), and that every figure is probe-derived — a low number is truth, not decoration. Short, concrete.",
    quick: [
      { label: "GODMODE Check", run: godmode },
      { label: "Health Check", run: runHealthSweep },
    ],
  },
  preview: {
    title: "Preview",
    sys: "You are the Preview sector agent of Dragons Alliance IDE. Help with live preview: Neo browser over CDP (click/scroll in the real frame), iframe mode, detected browsers (real /Applications scan) with login-safe open — the user signs in manually, the IDE never touches credentials. Short, concrete.",
    quick: [
      { label: "Terminal", run: goto("ide") },
    ],
  },
  creative: {
    title: "Creative",
    sys: "You are the Creative sector agent of Dragons Alliance IDE. Help with the creative framework: image/video platform slots are SETUP_REQUIRED until a real API key is saved in Settings ▸ API Power Center — no key, no fake output, ever. Recommend workflows honestly. Short, concrete.",
    quick: [
      { label: "API Power Center", run: admin("powercenter") },
    ],
  },
  guide: {
    title: "Guide",
    sys: "You are the Guide agent of Dragons Alliance IDE — a premium local-first AI operations IDE. Facts: 8 superpowers in the dock (GODMODE command center, RuFlo workflow engine, Agents swarm, Claude sessions, Graphify graph engine, Obsidian vault, Google APIs, LLM Hub local+API models); 8 sectors (Terminal ⌘1, Agents ⌘2, Code ⌘3, Neuromap ⌘4, Drive ⌘5, Metrics ⌘6, Preview ⌘7, Creative ⌘8); Admin Command Center (Control Room, Tools, Quick Guide, Reference); ⌘K palette. Doctrine: every button is real or honestly disabled with a reason; statuses come from real probes. Answer usage questions concretely and briefly; suggest the exact button/panel to press.",
    quick: [
      { label: "Explain Superpowers", run: openLibraryGuide },
      { label: "Open Tools", run: openLibraryTools },
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

/** REAL 8-deck tour — navigates the actual views with narrated toasts. */
export function startGuideTour() {
  pushToast({ kind: "info", title: "Dragon tour — 8 sectors", detail: "watch the decks change", ttl: 2500 });
  TOUR.forEach((s, i) => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("dai:goto", { detail: s.view }));
      pushToast({ kind: "info", title: s.title, detail: s.detail, ttl: 1700 });
    }, 400 + i * 1900);
  });
  window.dai.audit.log("guide-tour", "8-sector tour started");
}

// per-sector session memory — the thread survives collapse/deck switches
const MEM = new Map<AgentSector, { hist: LlmChatMsg[]; log: ChatLine[] }>();
const greetFor = (sector: AgentSector): ChatLine =>
  sector === "guide"
    ? { role: "assistant", text: "Vrei tur rapid sau ai o întrebare concretă?" }
    : { role: "assistant", text: `${SECTOR_META[sector].title} agent ready — ask about this sector.` };

/**
 * Shared chat brain. `active` gates the LLM Hub probe; conversations persist per
 * sector in module memory. send() talks to the REAL local model and returns
 * whether the message was dispatched.
 */
export function useSectorChat(sector: AgentSector, active: boolean) {
  const meta = SECTOR_META[sector] ?? SECTOR_META.guide;
  const { data: hub } = useQuery({
    queryKey: ["llm-status"], queryFn: () => window.dai.llm.status(),
    enabled: active, refetchInterval: 12000,
  });
  const ollama = hub?.providers.find((p) => p.id === "ollama");
  const model = hub?.providers.find((p) => p.id === "hermes-local")?.models[0] ?? ollama?.models[0] ?? "";
  const ready = ollama?.state === "active" && !!model;

  const mem = (() => { let m = MEM.get(sector); if (!m) { m = { hist: [], log: [greetFor(sector)] }; MEM.set(sector, m); } return m; })();
  const [log, setLog] = useState<ChatLine[]>(mem.log);
  const [busy, setBusy] = useState(false);
  const histRef = useRef<LlmChatMsg[]>(mem.hist);

  // sector switched under the same consumer → swap to that sector's memory
  useEffect(() => {
    const m = MEM.get(sector) ?? { hist: [], log: [greetFor(sector)] };
    MEM.set(sector, m);
    histRef.current = m.hist;
    setLog(m.log);
  }, [sector]);

  const push = (l: ChatLine) => setLog((x) => { const nx = [...x, l]; mem.log = nx; return nx; });

  async function send(text: string): Promise<boolean> {
    const t = text.trim();
    if (!t || busy || !ready) return false;
    push({ role: "user", text: t });
    setBusy(true);
    try {
      const msgs: LlmChatMsg[] = [{ role: "system", content: meta.sys }, ...histRef.current, { role: "user", content: t }];
      const r = await window.dai.llm.chat(model, msgs);
      if (r.ok) {
        histRef.current = ([...histRef.current, { role: "user", content: t }, { role: "assistant", content: r.text }] as LlmChatMsg[]).slice(-12);
        mem.hist = histRef.current;
        push({ role: "assistant", text: r.text });
      } else {
        push({ role: "err", text: `model error: ${r.error ?? "unknown"}` });
      }
    } catch (e) {
      push({ role: "err", text: String(e).slice(0, 160) });
    }
    setBusy(false);
    return true;
  }

  return { meta, model, ready, log, busy, send };
}
