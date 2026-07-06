// Settings — the single, serious configuration surface. What used to be five
// sibling admin tabs (Settings / Audit / Permissions / Team Sync / API Health) is
// now ONE panel with a category left-nav. Admin categories are hidden when the
// current member lacks the matching adm:* grant — cooperative gating that shapes
// the UI per member, NOT a hard security boundary (see the design spec). Opens via
// the `dai:admin` event with detail = category id (legacy tab ids remapped by App).
import { IcSigil } from "./icons";
import { useEscape } from "../hooks/useEscape";
import { useMe } from "../hooks/useMe";
import {
  SETTINGS_CATS, type SettingsCat,
  AppearanceSection, IdeConfigSection, SuperpowersSection,
  IntegrationsSection, ShortcutsSection, DeveloperSection,
  TeamSection, TeamSyncSection, AuditSection, ApiHealthSection,
} from "./settings/SettingsSections";

export function AdminPanel({ open, cat, onClose, onCat }: {
  open: boolean; cat: SettingsCat; onClose: () => void; onCat: (c: SettingsCat) => void;
}) {
  useEscape(open, onClose);
  const { can } = useMe();
  if (!open) return null;
  // Hide admin categories the member lacks the grant for; Team stays visible.
  const cats = SETTINGS_CATS.filter((c) => !c.cap || can(c.cap));
  const active: SettingsCat = cats.some((c) => c.id === cat) ? cat : "appearance";
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="vault admin" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="vault-head">
          <span className="vault-glyph"><IcSigil size={22} /></span>
          <div>
            <h2>Settings</h2>
            <div className="vault-sub">appearance · IDE · team &amp; permissions · sync · audit · API health — all local, all real</div>
          </div>
          <button className="phone-x" onClick={onClose} title="Close (esc)">esc</button>
        </div>
        <div className="vault-body">
          <div className="set-wrap">
            <nav className="set-nav" aria-label="Settings categories">
              {cats.map((c) => (
                <button key={c.id} className={"set-nav-item" + (active === c.id ? " on" : "")} onClick={() => onCat(c.id)}>{c.label}</button>
              ))}
            </nav>
            <div className="set-body">
              {active === "appearance" && <AppearanceSection />}
              {active === "ide" && <IdeConfigSection />}
              {active === "team" && <TeamSection />}
              {active === "teamsync" && <TeamSyncSection />}
              {active === "superpowers" && <SuperpowersSection />}
              {active === "integrations" && <IntegrationsSection />}
              {active === "shortcuts" && <ShortcutsSection />}
              {active === "audit" && <AuditSection />}
              {active === "apihealth" && <ApiHealthSection />}
              {active === "developer" && <DeveloperSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
