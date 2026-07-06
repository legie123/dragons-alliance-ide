// Team section of Library — always visible, read/activate only. Shortcuts
// reference, superpowers quick actions (gated on the real "terminals" perms
// capability), and a read-only smart-tricks feed. Editing lives in AdminSection.
import { useQuery } from "@tanstack/react-query";
import { KEYMAP } from "../../keymap";
import { SUPERPOWERS } from "../../registry";
import { useOps } from "../../hooks/useOps";
import { OpStatusBadge } from "../da";
import { ShortcutList } from "../ShortcutList";

export function TeamSection({ activeProject, canTerminals }: { activeProject?: string | null; canTerminals: boolean }) {
  void activeProject; // superpower actions below are pre-bound in the registry — no per-project seeding here
  const { data: tips = [] } = useQuery({ queryKey: ["tips"], queryFn: () => window.dai.tips.list() });
  const { statuses, checking } = useOps();

  return (
    <>
      <section className="vault-card">
        <div className="vault-card-h">Shortcuts <span className="vault-badge mid">fixed bindings</span></div>
        <ShortcutList items={KEYMAP} />
      </section>

      <section className="vault-card">
        <div className="vault-card-h">Superpowers <span className="vault-badge mid">quick actions</span></div>
        {SUPERPOWERS.map((sp) => (
          <div key={sp.id} className="team-grp">
            <div className="audit-row">
              <span className="audit-detail" style={{ flex: "0 0 140px" }}><b>{sp.label}</b></span>
              <OpStatusBadge status={statuses[sp.id] ?? "unknown"} checking={checking} size="sm" />
              <span className="audit-detail">{sp.role}</span>
            </div>
            <div className="vault-row">
              {sp.actions.map((a) => {
                const enabled = !!a.run && canTerminals;
                const reason = a.disabledReason || (!canTerminals ? "requires terminal access" : undefined);
                return (
                  <button
                    key={a.id}
                    className="drv-btn ghost"
                    disabled={!enabled}
                    onClick={enabled ? a.run : undefined}
                    title={enabled ? undefined : reason}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="vault-card">
        <div className="vault-card-h">Smart tricks <span className="vault-badge on">{tips.length}</span></div>
        {tips.length === 0 && <div className="empty">no tips yet</div>}
        {tips.map((t) => (
          <div key={t.id} className="audit-row">
            <span className="audit-detail"><b>{t.title}</b>{t.category ? ` · ${t.category}` : ""} — {t.body}</span>
          </div>
        ))}
      </section>
    </>
  );
}
