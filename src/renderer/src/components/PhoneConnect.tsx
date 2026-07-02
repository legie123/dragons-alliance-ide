import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "../api";

// The cloud coding surface. Open on the phone (same Claude account as this Mac) →
// pick a repo → drive a full Claude Code agent, exactly like on the computer.
const PHONE_URL = "https://claude.ai/code";

/** owner/repo from a github web url, else the raw host path. */
function repoSlug(remote: string): string {
  const m = remote.match(/^https?:\/\/[^/]+\/(.+)$/);
  return m ? m[1] : remote;
}

export function PhoneConnect({
  open,
  onClose,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrErr, setQrErr] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Generate the QR lazily (qrcode is ~50KB — never in the initial bundle).
  useEffect(() => {
    if (!open || qr || qrErr) return;
    let alive = true;
    (async () => {
      try {
        const QR = await import("qrcode");
        const url = await QR.toDataURL(PHONE_URL, {
          margin: 1,
          width: 320,
          color: { dark: "#0b0e17", light: "#e7ecf6" },
          errorCorrectionLevel: "M",
        });
        if (alive) setQr(url);
      } catch {
        if (alive) setQrErr(true);
      }
    })();
    return () => { alive = false; };
  }, [open, qr, qrErr]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // pushed repos first (enrichProjects already orders live ones first), then the rest
  const { repos, noRepo } = useMemo(() => {
    const home = projects.filter((p) => p.name === "~");
    const rest = projects.filter((p) => !home.includes(p));
    return {
      repos: rest.filter((p) => p.remote),
      noRepo: rest.filter((p) => !p.remote),
    };
  }, [projects]);

  const copy = (slug: string) => {
    navigator.clipboard?.writeText(slug).then(
      () => { setCopied(slug); setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1600); },
      () => { /* clipboard blocked — no-op */ },
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="cmdk-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="phone" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}>

          <div className="phone-head">
            <span className="phone-glyph">📱</span>
            <div>
              <h2>Code from your phone</h2>
              <div className="phone-sub">Same Claude account, same repos — a full agent, exactly like here.</div>
            </div>
            <button className="phone-x" onClick={onClose} title="Close (esc)">esc</button>
          </div>

          <div className="phone-body">
            {/* ---- CODE ---- */}
            <section className="phone-sec">
              <div className="phone-sec-title">① Scan to open Claude Code</div>
              <div className="phone-qr-wrap">
                <div className="phone-qr">
                  {qr ? <img src={qr} alt="QR to claude.ai/code" width={168} height={168} />
                    : qrErr ? <div className="phone-qr-fallback">QR unavailable<br /><small>run npm install</small></div>
                    : <div className="phone-qr-fallback">generating…</div>}
                </div>
                <div className="phone-qr-side">
                  <div className="phone-url">claude.ai/code</div>
                  <p>Open your phone camera on the code, or type the link in the Claude app. You’re already signed in.</p>
                  <button className="phone-btn accent" onClick={() => window.dai.shell.open(PHONE_URL)}>
                    Open on this Mac ↗
                  </button>
                </div>
              </div>
            </section>

            {/* ---- REPO PICKER ---- */}
            <section className="phone-sec">
              <div className="phone-sec-title">② Pick a repo on the phone</div>
              {repos.length === 0 && (
                <div className="phone-note">No project is on GitHub yet. Push one, then it appears here.</div>
              )}
              <div className="phone-repos">
                {repos.map((p) => {
                  const slug = repoSlug(p.remote!);
                  return (
                    <div className="phone-repo" key={p.path}>
                      <span className="phone-repo-dot" style={{ background: p.session ? "#34d399" : p.terminals.length ? "#7c8cff" : "#59617a" }} />
                      <span className="phone-repo-name">{p.name}</span>
                      <span className="phone-repo-slug">{slug}</span>
                      <button className="phone-btn ghost" onClick={() => copy(slug)}>
                        {copied === slug ? "copied ✓" : "copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
              {noRepo.length > 0 && (
                <div className="phone-note dim">
                  {noRepo.length} project{noRepo.length > 1 ? "s" : ""} not on GitHub — push to code {noRepo.length > 1 ? "them" : "it"} from the phone.
                </div>
              )}
            </section>

            {/* ---- COMMUNICATE (stub, wired later) ---- */}
            <section className="phone-sec">
              <div className="phone-sec-title">③ Communicate <span className="phone-soon">connect later</span></div>
              <div className="phone-comms">
                <div className="phone-comm disabled">
                  <span className="phone-comm-ic">🎮</span>
                  <div>
                    <div className="phone-comm-name">Discord</div>
                    <div className="phone-comm-hint">bots &amp; channels — waiting for your connection</div>
                  </div>
                </div>
                <div className="phone-comm disabled">
                  <span className="phone-comm-ic">💬</span>
                  <div>
                    <div className="phone-comm-name">WhatsApp</div>
                    <div className="phone-comm-hint">intake bot — waiting for your connection</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="phone-foot">
            <span>scan · pick repo · code</span>
            <span>⌘J toggle · esc close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
