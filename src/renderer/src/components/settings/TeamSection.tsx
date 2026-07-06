// Team settings section — the roster + per-member capability matrix (owner-
// authored) plus each member's own resolved access. Writes <vault>/_team/team.json
// via window.dai.team.set; the Team Sync category commits+pushes it. Cooperative
// access control for a trusted team — it shapes each member's default UI and logs
// every change. It is NOT a hard security boundary (see the design spec). Owner-
// only editing: a non-owner gets no edit surface, only a read-only view of their
// own access.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamConfig, TeamRole } from "@shared/ipc";
import { TEAM_CAPS, resolvePreset, grantsHave, type TeamCapGroup } from "@shared/teamCaps";
import { useMe } from "../../hooks/useMe";

const GROUP_LABEL: Record<TeamCapGroup, string> = {
  sector: "Sectors", superpower: "Superpowers", action: "Sensitive actions", admin: "Admin areas",
};
const GROUP_ORDER: TeamCapGroup[] = ["sector", "superpower", "action", "admin"];
const GROUPED = GROUP_ORDER.map((g) => ({ group: g, caps: TEAM_CAPS.filter((c) => c.group === g) }));
const ROLES: TeamRole[] = ["owner", "editor", "viewer"];

export function TeamSection() {
  const qc = useQueryClient();
  const { me, isOwner } = useMe();
  const { data: base } = useQuery({ queryKey: ["team"], queryFn: () => window.dai.team.get() });
  const [draft, setDraft] = useState<TeamConfig | null>(null);
  const [name, setName] = useState("");
  const cfg = draft ?? base;
  if (!cfg) return <div className="empty">loading…</div>;

  function toggleCap(memberId: string, capId: string) {
    setDraft((d) => {
      const c = structuredClone(d ?? base!);
      const m = c.members.find((x) => x.id === memberId)!;
      if (m.role === "owner") return c; // owners keep all
      const has = m.grants.includes(capId);
      m.grants = has ? m.grants.filter((x) => x !== capId) : [...m.grants.filter((x) => x !== "*"), capId];
      return c;
    });
  }
  function applyPreset(memberId: string, role: TeamRole) {
    setDraft((d) => {
      const c = structuredClone(d ?? base!);
      const m = c.members.find((x) => x.id === memberId)!;
      m.role = role; m.grants = resolvePreset(role);
      return c;
    });
  }
  function addMember() {
    if (!name.trim()) return;
    setDraft((d) => {
      const c = structuredClone(d ?? base!);
      c.members.push({ id: "op-" + Date.now().toString(36), name: name.trim().slice(0, 60), role: "viewer", grants: resolvePreset("viewer") });
      return c;
    });
    setName("");
  }
  function removeMember(id: string) {
    setDraft((d) => {
      const c = structuredClone(d ?? base!);
      c.members = c.members.filter((m) => m.id !== id);
      return c;
    });
  }
  const save = async () => {
    await window.dai.team.set(draft ?? cfg);
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["team"] });
  };

  const identity = me?.member ? `${me.member.name} · ${me.member.role}` : me?.needsIdentity ? "not set on this machine" : "unknown";

  // ---- non-owner: read-only "your access" ----
  if (!isOwner) {
    return (
      <section className="vault-card">
        <div className="vault-card-h">Your access <span className="vault-badge mid">read-only</span></div>
        <div className="vault-steps">You are <b>{identity}</b>. Only an owner can change team access; changes arrive through Team Sync.</div>
        {GROUPED.map(({ group, caps }) => (
          <div key={group} className="team-grp">
            <div className="team-grp-h">{GROUP_LABEL[group]}</div>
            <div className="team-grants">
              {caps.map((cap) => {
                const on = grantsHave(me?.grants ?? [], cap.id);
                return (
                  <span key={cap.id} className={"team-grant" + (on ? " on" : "")} title={cap.description}>
                    <span className="team-dot" aria-hidden>{on ? "●" : "○"}</span>{cap.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    );
  }

  // ---- owner: roster + editable matrix ----
  const owners = cfg.members.filter((m) => m.role === "owner").length;
  return (
    <section className="vault-card">
      <div className="vault-card-h">Team &amp; permissions <span className="vault-badge on">{cfg.members.length} member(s)</span></div>
      <div className="vault-steps">
        You are <b>{identity}</b>. Cooperative access control for a trusted team — it shapes each member's default
        UI and logs every change. It is not a hard security boundary. Saved to <code>_team/team.json</code>;
        commit &amp; push it from the <b>Team Sync</b> category so teammates receive it.
      </div>

      <div className="team-matrix-wrap">
        <table className="team-matrix">
          <thead>
            <tr>
              <th className="team-corner">Member</th>
              {GROUPED.map(({ group, caps }) => (
                <th key={group} className="team-grp-col" colSpan={caps.length}>{GROUP_LABEL[group]}</th>
              ))}
            </tr>
            <tr>
              <th className="team-corner" />
              {GROUPED.flatMap(({ caps }) => caps.map((cap) => (
                <th key={cap.id} className="team-cap-col" title={cap.description}><span>{cap.label}</span></th>
              )))}
            </tr>
          </thead>
          <tbody>
            {cfg.members.map((m) => (
              <tr key={m.id}>
                <th className="team-member-cell">
                  <span className="team-member-name">{m.name}</span>
                  <select className="vault-in slim" value={m.role} onChange={(e) => applyPreset(m.id, e.target.value as TeamRole)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="drv-btn ghost team-rm" disabled={m.role === "owner" && owners === 1}
                    onClick={() => removeMember(m.id)}
                    title={m.role === "owner" && owners === 1 ? "the last owner cannot be removed" : "remove member"}>remove</button>
                </th>
                {GROUPED.flatMap(({ caps }) => caps.map((cap) => {
                  const on = grantsHave(m.grants, cap.id);
                  return (
                    <td key={cap.id} className="team-cell">
                      <input type="checkbox" checked={on} disabled={m.role === "owner"}
                        onChange={() => toggleCap(m.id, cap.id)}
                        title={m.role === "owner" ? "owners keep every capability" : cap.label} />
                    </td>
                  );
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vault-row">
        <input className="vault-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="new member name" />
        <button className="drv-btn" onClick={addMember} disabled={!name.trim()}>Add member</button>
      </div>

      <div className="vault-row">
        <button className="drv-btn accent" onClick={save} disabled={!draft}>Save team</button>
        {draft && <button className="drv-btn ghost" onClick={() => setDraft(null)}>Discard</button>}
      </div>
      {draft && <div className="vault-steps team-hint">Unsaved changes. After saving, open <b>Team Sync</b> to commit &amp; push <code>team.json</code> so the team receives it.</div>}
    </section>
  );
}
