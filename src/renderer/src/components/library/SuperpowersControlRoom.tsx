// Superpowers Control Room — a band inside the Admin Library. One card per
// superpower (from the SUPERPOWERS registry, live status from useOps). Clicking a
// card opens that superpower's full operational panel (GODMODE for godmode, the
// generic SuperpowerPanel for the rest). This is the single place an admin sees
// every power's status + a door into each panel.
import { SUPERPOWERS, openSuperpower } from "../../registry";
import { useOps } from "../../hooks/useOps";
import { OpStatusBadge } from "../da";

export function SuperpowersControlRoom() {
  const { env, statuses, liveCount, total, checking } = useOps();
  return (
    <section className="spcr">
      <div className="spcr-h">
        Superpowers Control Room
        <span className="spcr-live">{checking ? "…" : `${liveCount}/${total} live`}</span>
      </div>
      <div className="spcr-grid">
        {SUPERPOWERS.map((sp) => {
          const st = statuses[sp.id] ?? sp.statusOf(env);
          return (
            <button
              key={sp.id}
              className="spcr-card"
              style={{ ["--cat" as any]: sp.tone }}
              onClick={() => openSuperpower(sp.id)}
              title={`Open ${sp.label} panel`}
            >
              <div className="spcr-top">
                <span className="spcr-ic">{sp.icon({ size: 16 })}</span>
                <span className="spcr-name">{sp.label}</span>
              </div>
              <div className="spcr-role">{sp.role}</div>
              <div className="spcr-foot">
                <OpStatusBadge status={st} checking={checking} size="sm" />
                <span className="spcr-open">Open panel →</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
