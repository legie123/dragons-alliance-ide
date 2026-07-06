// First-run identity — a fresh machine has no ~/.config/dai/identity.json, so the
// app doesn't yet know WHICH team member this install belongs to. This modal
// resolves that once: pick yourself from the synced roster, or (empty vault) set
// yourself up as the owner. Written once, never asked again. Cooperative model —
// this is NOT authentication; it just tells the UI whose access to apply.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamConfig } from "@shared/ipc";
import { resolvePreset } from "@shared/teamCaps";
import { IcSigil } from "./icons";

export function FirstRunIdentity({ open, onDone }: { open: boolean; onDone: () => void }) {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<TeamConfig | null>(null);
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const [notListed, setNotListed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let done = false;
    window.dai.team.get().then((c) => { if (!done) { setCfg(c); setPick(c.members[0]?.id ?? ""); } }).catch(() => {});
    return () => { done = true; };
  }, [open]);

  if (!open) return null;

  const members = cfg?.members ?? [];
  const hasRoster = members.length > 0;
  const finish = () => { qc.invalidateQueries({ queryKey: ["me"] }); onDone(); };

  const selectExisting = async () => {
    if (!pick) return;
    setBusy(true);
    await window.dai.team.setIdentity(pick);
    setBusy(false); finish();
  };
  const createOwner = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const id = "op-" + Date.now().toString(36);
    const next: TeamConfig = { version: 1, updatedAt: Date.now(), updatedBy: id, members: [{ id, name: name.trim().slice(0, 60), role: "owner", grants: ["*"] }] };
    await window.dai.team.set(next);
    await window.dai.team.setIdentity(id);
    setBusy(false); finish();
  };
  const addSelfAsViewer = async () => {
    if (!name.trim() || !cfg) return;
    setBusy(true);
    const id = "op-" + Date.now().toString(36);
    const next: TeamConfig = { ...cfg, members: [...cfg.members, { id, name: name.trim().slice(0, 60), role: "viewer", grants: resolvePreset("viewer") }] };
    await window.dai.team.set(next);
    await window.dai.team.setIdentity(id);
    setBusy(false); finish();
  };

  return (
    <div className="cmdk-backdrop">
      <div className="vault" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Who are you?" aria-modal="true">
        <div className="vault-head">
          <span className="vault-glyph"><IcSigil size={22} /></span>
          <div>
            <h2>Who are you?</h2>
            <div className="vault-sub">This install needs to know which team member it belongs to. Stored locally at <code>~/.config/dai/identity.json</code> — asked once. Cooperative, not a login.</div>
          </div>
        </div>
        <div className="vault-body">
          {hasRoster ? (
            <section className="vault-card">
              <div className="vault-card-h">Pick yourself <span className="vault-badge on">{members.length} on the team</span></div>
              <div className="vault-steps">The team roster arrived through the synced vault. Choose your name.</div>
              <div className="vault-row">
                <select className="vault-in" value={pick} onChange={(e) => setPick(e.target.value)}>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
                </select>
                <button className="drv-btn accent" onClick={selectExisting} disabled={busy || !pick}>{busy ? "saving…" : "That's me"}</button>
              </div>
              {!notListed ? (
                <button className="drv-btn ghost" onClick={() => setNotListed(true)}>I'm not listed</button>
              ) : (
                <>
                  <div className="vault-steps">You'll be added as a <b>viewer</b> (limited access). An owner can promote you later in Settings › Team.</div>
                  <div className="vault-row">
                    <input className="vault-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" />
                    <button className="drv-btn" onClick={addSelfAsViewer} disabled={busy || !name.trim()}>{busy ? "adding…" : "Add me as viewer"}</button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="vault-card">
              <div className="vault-card-h">Set up your team <span className="vault-badge mid">first run</span></div>
              <div className="vault-steps">No team config yet. Enter your name to create yourself as the owner; add teammates later in Settings › Team, then commit &amp; push from Team Sync.</div>
              <div className="vault-row">
                <input className="vault-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" />
                <button className="drv-btn accent" onClick={createOwner} disabled={busy || !name.trim()}>{busy ? "creating…" : "Create as owner"}</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
