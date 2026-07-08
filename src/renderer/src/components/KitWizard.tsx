// Kit Wizard — first-run modal wrapping the KitSetup checklist. A fresh install
// has zero context on what's installed; this is the one-time doorway that shows
// exactly which superpowers are ready and which need one command or sign-in.
// Reopens later from the Library → Kit tab or the ⌘K palette — same body, this
// is just the modal shell around it (mirrors FirstRunIdentity/GodModePanel).
import { KitSetup } from "./KitSetup";
import { DragonEmblem } from "./DragonEmblem";
import { useEscape } from "../hooks/useEscape";

export function KitWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="kit" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your Kit" aria-modal="true">
        <div className="kit-head">
          <DragonEmblem size={26} />
          <div>
            <div className="kit-title">Your Kit</div>
            <div className="kit-sub">Install these to run Dragons Alliance IDE at full power</div>
          </div>
          <button className="kit-x" onClick={onClose} title="Close (esc)">esc</button>
        </div>
        <div className="kit-body">
          <KitSetup />
        </div>
        <div className="kit-foot">You can reopen this anytime from the Admin Library → Kit tab, or the ⌘K palette.</div>
      </div>
    </div>
  );
}
