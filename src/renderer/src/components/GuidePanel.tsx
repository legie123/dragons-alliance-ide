// DRAGON GUIDE — interactive, bilingual drawer. Sections: Welcome, Core
// Sectors (generated from the registry), Superpowers (live status), Workflows,
// Status Explained (from STATUS_META — can't drift), Shortcuts (keymap.ts),
// Team Mode (honest pending), Troubleshooting (real fixes).
import { useEffect, useMemo, useState } from "react";
import { CORE_SECTORS, SUPERPOWERS, STATUS_META, deployTerm, openGraphify, openObsidian, vault, admin, openSuperpower, type SectorId, type OpStatus } from "../registry";
import { useSectorChat, startGuideTour } from "./SectorAgent";
import { GUIDE_SECTIONS, SECTOR_GUIDE, type GuideStep } from "../guideContent";
import { KEYMAP } from "../keymap";
import { STATUS_EXPLAIN } from "./EcosystemBar";
import { useOps } from "../hooks/useOps";
import { useT } from "../hooks/useAppearance";
import { useEscape } from "../hooks/useEscape";
import { OpStatusBadge } from "./da";
import { IcBook, IcX } from "./icons";
import type { View } from "../views";

const ACTIONS: Record<string, () => void> = {
  "open-graphify": openGraphify,
  "open-obsidian": openObsidian,
  "open-keys": vault,
  "open-audit": admin("audit"),
  "launch-claude": deployTerm("claude", "~"),
  "copy-doctor": () => { navigator.clipboard.writeText("node scripts/superpowers-doctor.mjs --verbose").catch(() => {}); },
};

export function GuidePanel({ open, current, target, onClose, onOpenSector }: {
  open: boolean;
  current: View;
  target?: SectorId | null;
  onClose: () => void;
  onOpenSector: (id: View) => void;
}) {
  const t = useT();
  const { statuses, checking } = useOps();
  const [sectionId, setSectionId] = useState("welcome");
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  useEscape(open, onClose);
  // embedded agentic chat — the Guide agent lives INSIDE the drawer (local Hermes)
  const [q, setQ] = useState("");
  const chat = useSectorChat("guide", open);

  // deep-link: "?" in the right rail lands on that sector's step
  useEffect(() => {
    if (!open) return;
    if (target) {
      setSectionId("sectors");
      setStep(Math.max(0, CORE_SECTORS.findIndex((s) => s.id === target)));
    }
  }, [open, target]);

  // resolve steps for the active section (static or generated)
  const steps: GuideStep[] = useMemo(() => {
    const def = GUIDE_SECTIONS.find((s) => s.id === sectionId)!;
    if (def.kind === "sectors") {
      return CORE_SECTORS.map((s) => ({
        id: "sec-" + s.id,
        title: { en: s.label, ro: s.label },
        body: SECTOR_GUIDE[s.id].what,
        target: s.id as View,
        hint: SECTOR_GUIDE[s.id].first,
      })) as (GuideStep & { hint?: { en: string; ro: string } })[];
    }
    if (def.kind === "superpowers") {
      return SUPERPOWERS.map((sp) => ({
        id: "sp-" + sp.id,
        title: { en: sp.label, ro: sp.label },
        body: {
          en: `${sp.role}. Status now: ${checking ? "checking…" : STATUS_META[statuses[sp.id]].label} — ${checking ? "probing" : STATUS_EXPLAIN[statuses[sp.id]]}. Quick actions: ${sp.actions.map((a) => a.label).join(" · ")}.`,
          ro: `${sp.role}. Status acum: ${checking ? "se verifica…" : STATUS_META[statuses[sp.id]].label}. Actiuni rapide: ${sp.actions.map((a) => a.label).join(" · ")}.`,
        },
      }));
    }
    if (def.kind === "status") {
      return (Object.keys(STATUS_META) as OpStatus[]).map((st) => ({
        id: "st-" + st,
        title: { en: STATUS_META[st].label.toUpperCase(), ro: STATUS_META[st].label.toUpperCase() },
        body: { en: STATUS_EXPLAIN[st], ro: STATUS_EXPLAIN[st] },
      }));
    }
    if (def.kind === "shortcuts") {
      return KEYMAP.map((k) => ({
        id: "kb-" + k.keys,
        title: { en: `${k.keys} · ${k.scope}`, ro: `${k.keys} · ${k.scope}` },
        body: k.label,
      }));
    }
    return def.steps ?? [];
  }, [sectionId, statuses, checking]);

  const idx = Math.min(step, steps.length - 1);
  const cur = steps[idx];
  const curStatus: OpStatus | null = sectionId === "superpowers" ? statuses[cur.id.replace("sp-", "")] ?? null
    : sectionId === "status" ? (cur.id.replace("st-", "") as OpStatus) : null;

  // ←/→ step navigation while open
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(steps.length - 1, s + 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, steps.length]);

  if (!open || !cur) return null;

  return (
    <div className="guide-backdrop" onClick={onClose}>
      <aside className="guide-drawer" role="dialog" aria-modal="true" aria-label="Dragon Guide" onClick={(e) => e.stopPropagation()}>
        <div className="guide-head">
          <span className="guide-glyph"><IcBook size={18} /></span>
          <div>
            <div className="guide-title">DRAGON GUIDE</div>
            <div className="guide-sub">{t({ en: "How to command the platform", ro: "Cum comanzi platforma" })}</div>
          </div>
          <button className="da-btn gold sm" style={{ marginLeft: "auto", marginRight: 8 }}
            title={t({ en: "real 8-deck tour — navigates the actual sectors", ro: "tur real prin cele 8 sectoare" })}
            onClick={() => { onClose(); startGuideTour(); }}>
            {t({ en: "Start Tour", ro: "Porneste turul" })}
          </button>
          <button className="guide-x" onClick={onClose} aria-label="Close guide"><IcX size={13} /></button>
        </div>

        <div className="guide-body">
          <nav className="guide-nav" aria-label="Guide sections">
            {GUIDE_SECTIONS.map((s) => (
              <button key={s.id} className={`guide-nav-item${s.id === sectionId ? " on" : ""}`}
                onClick={() => { setSectionId(s.id); setStep(0); }}>
                {t(s.title)}
              </button>
            ))}
          </nav>

          <div className="guide-step">
            <div className="guide-progress" aria-label={`step ${idx + 1} of ${steps.length}`}>
              <div className="guide-progress-fill" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="guide-step-count">{idx + 1} / {steps.length}</div>

            <div className="guide-step-head">
              <h3>{t(cur.title)}</h3>
              {curStatus && <OpStatusBadge status={curStatus} checking={sectionId === "superpowers" && checking} size="sm" />}
            </div>
            <p className="guide-step-body">{t(cur.body)}</p>
            {(cur as any).hint && <p className="guide-step-hint">{t((cur as any).hint)}</p>}
            {cur.disabledReason && <p className="guide-step-pending">{t(cur.disabledReason)}</p>}

            <div className="guide-actions">
              {cur.target && (
                <button className="da-btn gold sm" onClick={() => { onOpenSector(cur.target!); onClose(); }}>
                  {t({ en: "Open this sector", ro: "Deschide sectorul" })}{cur.target === current ? t({ en: " (current)", ro: " (curent)" }) : ""}
                </button>
              )}
              {cur.action && (
                <button className="da-btn ghost sm" onClick={() => {
                  ACTIONS[cur.action!.id]?.();
                  if (cur.action!.id === "copy-doctor") { setCopied(true); setTimeout(() => setCopied(false), 1800); }
                }}>
                  {copied && cur.action.id === "copy-doctor" ? t({ en: "Copied ✓", ro: "Copiat ✓" }) : t(cur.action.label)}
                </button>
              )}
            </div>

            <div className="guide-stepnav">
              <button className="da-btn ghost sm" disabled={idx === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                ← {t({ en: "Back", ro: "Inapoi" })}
              </button>
              <button className="da-btn ghost sm" disabled={idx >= steps.length - 1} onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
                {t({ en: "Next", ro: "Urmatorul" })} →
              </button>
            </div>
          </div>
        </div>

        {/* GUIDE AGENT — embedded agentic chat, answered by the LOCAL model */}
        <div className="guide-chat">
          <div className="guide-chat-head">
            GUIDE AGENT <i>{chat.ready ? `· ${chat.model} · local` : t({ en: "· local model offline", ro: "· model local oprit" })}</i>
          </div>
          {chat.ready ? (
            <>
              <div className="guide-chat-log">
                {chat.log.slice(-8).map((m, i) => <div key={i} className={`sga-line sga-${m.role}`}>{m.text}</div>)}
                {chat.busy && <div className="sga-line sga-assistant sga-busy">thinking…</div>}
              </div>
              <div className="sga-in guide-chat-in">
                <input value={q} onChange={(e) => setQ(e.target.value)} disabled={chat.busy}
                  onKeyDown={(e) => { if (e.key === "Enter") { void chat.send(q); setQ(""); } }}
                  placeholder={t({ en: "ask anything about the platform…", ro: "intreaba orice despre platforma…" })} />
                <button className="da-btn gold sm" disabled={chat.busy || !q.trim()}
                  onClick={() => { void chat.send(q); setQ(""); }}>Send</button>
              </div>
            </>
          ) : (
            <div className="guide-chat-setup">
              {t({ en: "Start the local Ollama server (`ollama serve`) to talk to the guide — no keys needed.", ro: "Porneste serverul Ollama local (`ollama serve`) ca sa vorbesti cu ghidul — fara chei." })}
              <button className="da-btn ghost sm" onClick={() => { onClose(); openSuperpower("llmhub"); }}>Open LLM Hub</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
