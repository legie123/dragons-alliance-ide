// Kit Setup — the honest checklist body: what's ready, what's one command away,
// what needs a sign-in. No silent auto-install anywhere — missing/partial rows
// only ever offer COPY (install command) or DOCS (open in browser) or a named
// action event. Shared by the first-run KitWizard modal and the Library → Kit
// tab (same component, two mounting points).
import { useKit, type KitResult, type KitStatus } from "../hooks/useKit";
import { pushToast } from "../toast";

const STATUS_LABEL: Record<KitStatus, string> = {
  ready: "READY",
  partial: "NEEDS SIGN-IN",
  missing: "MISSING",
};

function KitRow({ r }: { r: KitResult }) {
  const { item, status } = r;
  const copyInstall = () => {
    if (!item.install) return;
    navigator.clipboard.writeText(item.install).catch(() => {});
    pushToast({ kind: "success", title: "Install command copied", detail: item.install });
  };
  const openDocs = () => { if (item.docs) window.dai.shell.open(item.docs); };
  const runAction = () => { if (item.actionEvent) window.dispatchEvent(new CustomEvent(item.actionEvent)); };
  return (
    <div className="kit-row" style={{ ["--kit-tone" as any]: item.tone }} data-status={status}>
      <span className="kit-row-ic">{item.icon({ size: 18 })}</span>
      <div className="kit-row-main">
        <div className="kit-row-label">{item.label}</div>
        <div className="kit-row-powers">{item.powers}</div>
        <div className="kit-row-note">{item.note}</div>
      </div>
      <span className="kit-row-status">{STATUS_LABEL[status]}</span>
      <div className="kit-row-actions">
        {status === "ready" ? (
          <span className="kit-row-ok" aria-hidden="true">✓</span>
        ) : (
          <>
            {item.install && <button className="da-btn gold sm" onClick={copyInstall}>Copy install</button>}
            {item.docs && <button className="da-btn ghost sm" onClick={openDocs}>Download / Docs</button>}
            {item.actionEvent && <button className="da-btn ghost sm" onClick={runAction}>{item.actionLabel || "Run"}</button>}
          </>
        )}
      </div>
    </div>
  );
}

export function KitSetup() {
  const { results, ready, total, optionalResults, complete, checking, recheck } = useKit();
  const pct = total ? (ready / total) * 100 : 0;
  return (
    <div className="kit-setup">
      <div className="kit-progress">
        <span className="kit-count">{complete ? "Kit at max potential ✓" : `${ready}/${total} ready`}</span>
        <div className="kit-bar"><div className="kit-bar-fill" style={{ width: `${pct}%` }} /></div>
        <button className="da-btn ghost sm" onClick={recheck} disabled={checking}>{checking ? "checking…" : "Recheck"}</button>
      </div>

      {complete && (
        <div className="kit-done">🐉 Your kit is at full power — every superpower is ready.</div>
      )}

      <div className="kit-list">
        {results.map((r) => <KitRow key={r.item.id} r={r} />)}
        {optionalResults.length > 0 && (
          <>
            <div className="kit-divider">optional</div>
            {optionalResults.map((r) => <KitRow key={r.item.id} r={r} />)}
          </>
        )}
      </div>
    </div>
  );
}
