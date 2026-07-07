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
import { toolsForSector, execTool, groundingContext, toolLogLine } from "../agentTools";
import type { LlmChatMsg } from "@shared/ipc";

export type AgentSector =
  | "ide" | "agents" | "code" | "neuromap" | "drive" | "metrics" | "preview" | "creative" | "guide";

export type ChatLine = { role: "user" | "assistant" | "err" | "tool"; text: string };

const GROUND_RULE =
  " You are a CAPABLE agent, not a chatbot: you have TOOLS that read and act on the real IDE, and you are PERMANENTLY grounded in the user's Obsidian vault (Antigravity-Brain) and Graphify knowledge graph. ALWAYS prefer calling a tool to get real data over guessing. When the user asks about their knowledge/projects/notes, call search_vault or graph_links. Use the sector tools to actually DO the task. After tools return, answer concisely in the user's language with the REAL result — never invent numbers or say you cannot act when a tool exists.";

// quick = a couple of real navigation shortcuts; starters = example prompts that
// make the agent DO something real (tool-calling) so the user sees capability.
export const SECTOR_META: Record<AgentSector, { title: string; sys: string; quick: { label: string; run: () => void }[]; starters: string[] }> = {
  ide: {
    title: "Terminal",
    sys: "You are the Terminal sector agent of Dragons Alliance IDE. You can list terminals and run commands in real visible workers. Status words: running=active now, idle=ready not error, done, error=real failure. Be concrete and short.",
    quick: [{ label: "Health Check", run: runHealthSweep }, { label: "Logs", run: admin("audit") }],
    starters: ["What terminals are open right now?", "Run `git status` in this repo"],
  },
  agents: {
    title: "Agents",
    sys: "You are the Agents sector agent of Dragons Alliance IDE. You can list live Claude agents and launch new ones. 0 live agents = nothing running, not an error. Short, concrete answers.",
    quick: [{ label: "RuFlo Panel", run: () => openSuperpower("ruflo") }, { label: "Swarm Map", run: goto("neuromap") }],
    starters: ["How many agents are live and what are they doing?", "Launch a Claude agent in my home dir"],
  },
  code: {
    title: "Code",
    sys: "You are the Code sector agent of Dragons Alliance IDE. You can list files and read files (HOME-confined). Help with the editor, save, and the Build/Typecheck action bar. Short, concrete.",
    quick: [{ label: "Terminal", run: goto("ide") }, { label: "Palette ⌘K", run: openPalette }],
    starters: ["List the files in my code folder", "Read package.json and tell me the scripts"],
  },
  neuromap: {
    title: "Neuromap",
    sys: "You are the Neuromap sector agent of Dragons Alliance IDE. You have real access to the Obsidian vault and Graphify knowledge graph — search notes and follow links. Short, concrete.",
    quick: [{ label: "Graphify Panel", run: () => openSuperpower("graphify") }, { label: "Open Vault", run: () => openSuperpower("obsidian") }],
    starters: ["How big is my knowledge graph?", "What does my vault say about Dragons Alliance?"],
  },
  drive: {
    title: "Drive",
    sys: "You are the Drive sector agent of Dragons Alliance IDE. You can check the real Google connection status. Honest gate until the user signs in — nothing simulated. Short, concrete.",
    quick: [{ label: "Google Setup", run: () => openSuperpower("google") }, { label: "Sync Vault", run: () => openSuperpower("obsidian") }],
    starters: ["Is my Google account connected?", "What do I need to do to use Drive?"],
  },
  metrics: {
    title: "Metrics",
    sys: "You are the Metrics sector agent of Dragons Alliance IDE. You can read the real session metrics and system status. Every figure is probe-derived — a low number is truth. Short, concrete.",
    quick: [{ label: "GODMODE Check", run: godmode }, { label: "Health Check", run: runHealthSweep }],
    starters: ["Give me my metrics right now", "What's the system status?"],
  },
  preview: {
    title: "Preview",
    sys: "You are the Preview sector agent of Dragons Alliance IDE. You can detect installed browsers and open URLs (login-safe — the user signs in manually). Short, concrete.",
    quick: [{ label: "Terminal", run: goto("ide") }],
    starters: ["Which browsers are installed on this machine?", "Open localhost:3000 in Chrome"],
  },
  creative: {
    title: "Creative",
    sys: "You are the Creative sector agent of Dragons Alliance IDE. Image/video slots are SETUP_REQUIRED until a real API key is saved in Settings ▸ API Power Center — no key, no fake output. Recommend honestly. Short, concrete.",
    quick: [{ label: "API Power Center", run: admin("powercenter") }],
    starters: ["What do I need to generate images here?", "Explain the creative workflow"],
  },
  guide: {
    title: "Guide",
    sys: "You are the Guide agent of Dragons Alliance IDE — a premium local-first AI operations IDE with 8 superpowers (GODMODE, RuFlo, Agents, Claude, Graphify, Obsidian, Google APIs, LLM Hub) and 8 sectors (Terminal ⌘1 … Creative ⌘8), an Admin Command Center and a ⌘K palette. You have real access to the user's Obsidian vault + Graphify graph and can check live system status and navigate. Doctrine: every button is real or honestly disabled. Answer concretely; name the exact button/panel; use tools for real data.",
    quick: [{ label: "Explain Superpowers", run: openLibraryGuide }, { label: "Open Tools", run: openLibraryTools }],
    starters: ["What can this platform do?", "What's in my vault about the current project?"],
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

  // AGENTIC LOOP: permanent Obsidian/Graphify grounding + real tool-calling.
  // Injects live vault+graph context each turn, exposes the sector's real tools,
  // executes tool calls against window.dai.*, shows the activity, loops until the
  // model gives a final answer (or a safe cap). Falls back to a plain answer if
  // the local model doesn't tool-call.
  async function send(text: string): Promise<boolean> {
    const t = text.trim();
    if (!t || busy || !ready) return false;
    push({ role: "user", text: t });
    setBusy(true);
    try {
      const ground = await groundingContext(t);
      const tools = toolsForSector(sector);
      const convo: LlmChatMsg[] = [
        { role: "system", content: meta.sys + GROUND_RULE },
        { role: "system", content: "LIVE KNOWLEDGE (Obsidian vault + Graphify graph):\n" + ground },
        ...histRef.current,
        { role: "user", content: t },
      ];
      let finalText = "";
      for (let hop = 0; hop < 4; hop++) {
        const r = await window.dai.llm.chat(model, convo, tools);
        if (!r.ok) { push({ role: "err", text: `model error: ${r.error ?? "unknown"}` }); setBusy(false); return true; }
        if (r.toolCalls && r.toolCalls.length) {
          convo.push((r.raw as LlmChatMsg) ?? { role: "assistant", content: r.text, tool_calls: r.toolCalls });
          for (const call of r.toolCalls) {
            const result = await execTool(sector, call.name, call.arguments);
            push({ role: "tool", text: toolLogLine(call.name, call.arguments, result) });
            convo.push({ role: "tool", content: JSON.stringify(result).slice(0, 3000) });
          }
          if (r.text) push({ role: "assistant", text: r.text }); // model's interim reasoning, if any
          continue; // let the model use the tool results
        }
        finalText = r.text || "(no answer)";
        push({ role: "assistant", text: finalText });
        break;
      }
      if (!finalText) { // hit the hop cap mid-tools — summarize honestly
        const r = await window.dai.llm.chat(model, [...convo, { role: "user", content: "Now answer my question using the tool results above, concisely." }]);
        finalText = r.ok ? (r.text || "(no answer)") : `tools ran; summary failed: ${r.error}`;
        push({ role: "assistant", text: finalText });
      }
      histRef.current = ([...histRef.current, { role: "user", content: t }, { role: "assistant", content: finalText }] as LlmChatMsg[]).slice(-10);
      mem.hist = histRef.current;
    } catch (e) {
      push({ role: "err", text: String(e).slice(0, 160) });
    }
    setBusy(false);
    return true;
  }

  return { meta, model, ready, log, busy, send };
}
