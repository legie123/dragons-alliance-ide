// Settings ▸ API Power Center — every credential surface in one honest place.
// Keys flow ONLY through window.dai.llm.set into ~/.config/dai/llm.json (0600,
// main process); llm.status() returns hasKey + last4 — plaintext never reaches
// this renderer and is never echoed back after save. Badges mirror the hub
// verbatim: a stored key is "configured" (never "active") until a real Test
// Connection proves the endpoint. Creative/Discord slots reuse the same 0600
// store and say plainly that no SDK/runtime reads them yet.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LlmProviderState, LlmProviderStatus } from "@shared/ipc";
import { pushToast, updateToast } from "../../toast";
import { fetchGDriveStatus } from "../../api";
import { vault, admin } from "../../registry";

// Render order per spec; the hub itself defines what exists — rows come from
// llm.status() and any id the backend stops reporting shows an honest gap row.
const LLM_ORDER = ["anthropic", "openai", "gemini", "ollama", "hermes-local", "claude-cli", "gamma", "gin", "custom"];
const KEYED = new Set(["anthropic", "openai", "gemini", "gamma", "gin", "custom"]);
const STATE_COLOR: Record<LlmProviderState, string> = {
  active: "var(--teal)",            // proven by a live probe
  configured: "var(--blue)",        // key/endpoint saved, unverified
  setup_required: "var(--accent-ember)",
};

async function testProvider(id: string, refetch: () => void) {
  const tid = pushToast({ kind: "checking", title: `testing ${id}…` });
  try {
    const r = await window.dai.llm.test(id);
    updateToast(tid, { kind: r.ok ? "success" : "error", title: `${id}: ${r.message}`, ttl: 6000 });
    window.dai.audit.log("powercenter-test", `${id}: ${r.ok ? "ok" : "fail"} — ${r.message}`);
  } catch (e) {
    updateToast(tid, { kind: "error", title: `${id}: test failed`, detail: String(e).slice(0, 120), ttl: 6000 });
  }
  refetch();
}

// Shared save path — audit detail names WHAT was saved, never the value.
async function saveSlot(id: string, patch: { key?: string; endpoint?: string }, label: string): Promise<boolean> {
  try {
    await window.dai.llm.set(id, patch);
    const what = [patch.key && "key", patch.endpoint && "endpoint"].filter(Boolean).join(" + ");
    window.dai.audit.log("powercenter-save", `${id}: ${what} saved (masked)`);
    pushToast({ kind: "success", title: `${label} saved (0600, masked)` });
    return true;
  } catch (e) {
    pushToast({ kind: "error", title: `${label}: save failed`, detail: String(e).slice(0, 120) });
    return false;
  }
}

function ProviderRow({ p, refetch }: { p: LlmProviderStatus; refetch: () => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [busy, setBusy] = useState(false);
  const keyed = KEYED.has(p.id);
  const canSave = !!key.trim() || (p.id === "custom" && !!endpoint.trim());
  const save = async () => {
    const patch: { key?: string; endpoint?: string } = {};
    if (key.trim()) patch.key = key.trim();
    if (p.id === "custom" && endpoint.trim()) patch.endpoint = endpoint.trim();
    setBusy(true);
    if (await saveSlot(p.id, patch, p.label)) { setKey(""); setEndpoint(""); setOpen(false); refetch(); }
    setBusy(false);
  };
  const clear = async () => {
    if (!window.confirm(`Remove the stored ${p.label} credentials from ~/.config/dai/llm.json?`)) return;
    try {
      await window.dai.llm.set(p.id, { clear: true });
      window.dai.audit.log("powercenter-clear", `${p.id}: credentials cleared`);
      pushToast({ kind: "info", title: `${p.label} credentials cleared` });
      refetch();
    } catch (e) {
      pushToast({ kind: "error", title: `${p.label}: clear failed`, detail: String(e).slice(0, 120) });
    }
  };
  const models = p.models.slice(0, 3).join(", ") + (p.models.length > 3 ? ` +${p.models.length - 3}` : "");
  return (
    <>
      <div className="audit-row">
        <span className="audit-detail" style={{ flex: "0 0 150px" }}><b>{p.label}</b></span>
        <span className="audit-kind" style={{ color: STATE_COLOR[p.state] }}>{p.state}</span>
        <span className="audit-detail" title={p.detail}>
          {p.models.length > 0 && <>{models} · </>}
          {p.keyMasked && <>key {p.keyMasked} · </>}
          {p.detail}
        </span>
        <button className="drv-btn ghost" onClick={() => testProvider(p.id, refetch)}>Test Connection</button>
        {keyed && <button className="drv-btn ghost" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Configure"}</button>}
        {keyed && p.hasKey && <button className="drv-btn" onClick={clear}>Clear</button>}
      </div>
      {keyed && open && (
        <div className="vault-row">
          <input className="vault-in" type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="paste key — stored 0600, masked" autoComplete="new-password" spellCheck={false} />
          {p.id === "custom" && (
            <input className="vault-in" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
              placeholder={p.endpoint ?? "https://host/v1/models (GET probe)"} spellCheck={false} />
          )}
          <button className="drv-btn accent" onClick={save} disabled={busy || !canSave}>{busy ? "saving…" : "Save"}</button>
        </div>
      )}
    </>
  );
}

function LlmApisCard() {
  const qc = useQueryClient();
  const { data: hub } = useQuery({ queryKey: ["llm-status"], queryFn: () => window.dai.llm.status(), refetchInterval: 12000 });
  const refetch = () => qc.invalidateQueries({ queryKey: ["llm-status"] });
  const byId = new Map<string, LlmProviderStatus>((hub?.providers ?? []).map((p) => [p.id, p]));
  return (
    <section className="vault-card">
      <div className="vault-card-h">LLM APIs
        <span className={"vault-badge " + (hub && hub.active > 0 ? "on" : "mid")}>
          {hub ? `${hub.active} active · ${hub.configured} configured` : "checking…"}
        </span>
      </div>
      <div className="vault-steps">
        States mirror <code>llm.status()</code> verbatim — a saved key is <b>configured</b> until
        Test Connection proves it on demand; <b>active</b> means a live local probe succeeded.
      </div>
      {!hub && <div className="empty">probing providers…</div>}
      {hub && LLM_ORDER.map((id) => {
        const p = byId.get(id);
        return p ? <ProviderRow key={id} p={p} refetch={refetch} /> : (
          <div key={id} className="audit-row">
            <span className="audit-detail" style={{ flex: "0 0 150px" }}><b>{id}</b></span>
            <span className="audit-detail">not reported by the LLM hub backend</span>
          </div>
        );
      })}
    </section>
  );
}

function GoogleApisCard() {
  const { data: g } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 8000 });
  const badge = g?.signedIn ? "on" : g?.configured ? "mid" : "off";
  const state = !g ? "checking…"
    : g.signedIn ? `signed in${g.email ? " · " + g.email : ""}`
    : g.configured ? "configured — sign in" : "setup required";
  return (
    <section className="vault-card">
      <div className="vault-card-h">Google APIs <span className={"vault-badge " + badge}>{state}</span></div>
      <div className="vault-steps">Read-only here. The OAuth client + sign-in live in the Keys vault; per-service probes in API Health.</div>
      <div className="vault-row">
        <button className="drv-btn accent" onClick={vault}>Open Keys</button>
        <button className="drv-btn ghost" onClick={admin("health")}>API Health</button>
      </div>
    </section>
  );
}

function CreativeSlot({ id, label }: { id: string; label: string }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    if (await saveSlot(id, { key: key.trim() }, label)) setKey("");
    setBusy(false);
  };
  return (
    <div className="vault-row">
      <span className="audit-detail" style={{ flex: "0 0 150px" }}><b>{label}</b></span>
      <input className="vault-in" type="password" value={key} onChange={(e) => setKey(e.target.value)}
        placeholder="paste key — stored 0600, masked" autoComplete="new-password" spellCheck={false} />
      <button className="drv-btn accent" onClick={save} disabled={busy || !key.trim()}>{busy ? "saving…" : "Save"}</button>
      <button className="drv-btn ghost" disabled title="no test available — SDK not integrated">Test Connection</button>
    </div>
  );
}

function CreativeApisCard() {
  return (
    <section className="vault-card">
      <div className="vault-card-h">Creative APIs <span className="vault-badge mid">setup_required</span></div>
      <div className="vault-steps">
        Keys are stored for the Creative framework — <b>no platform SDK wired yet (setup_required)</b>.
        They land in the same 0600 store; nothing reads them until an integration ships, and the hub
        status does not report these slots.
      </div>
      <CreativeSlot id="creative-image" label="Image generation" />
      <CreativeSlot id="creative-video" label="Video generation" />
    </section>
  );
}

function ObsidianCard() {
  return (
    <section className="vault-card">
      <div className="vault-card-h">Obsidian <span className="vault-badge mid">read-only</span></div>
      <div className="vault-steps">
        Vault path: <code>~/Documents/Obsidian/Antigravity-Brain</code> — probed live by the Obsidian
        superpower (no key needed here). Git sync controls live in Settings ▸ Team Sync.
      </div>
    </section>
  );
}

function DiscordCard() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    if (await saveSlot("discord", { key: key.trim() }, "Discord token")) setKey("");
    setBusy(false);
  };
  return (
    <section className="vault-card">
      <div className="vault-card-h">Discord <span className="vault-badge mid">no runtime wired</span></div>
      <div className="vault-steps">
        Honest state: <b>no Discord runtime is wired in this IDE yet</b>. The token is stored (0600,
        masked) for when one lands — nothing reads it today.
      </div>
      <div className="vault-row">
        <input className="vault-in" type="password" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="paste bot token — stored 0600, masked" autoComplete="new-password" spellCheck={false} />
        <button className="drv-btn accent" onClick={save} disabled={busy || !key.trim()}>{busy ? "saving…" : "Save"}</button>
      </div>
    </section>
  );
}

export function PowerCenterSection() {
  return (
    <>
      <div className="vault-steps">
        Keys are stored in <code>~/.config/dai/llm.json</code> (0600), masked everywhere, never sent
        anywhere except the provider you explicitly Test.
      </div>
      <LlmApisCard />
      <GoogleApisCard />
      <CreativeApisCard />
      <ObsidianCard />
      <DiscordCard />
    </>
  );
}
