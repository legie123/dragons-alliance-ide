// Credentials Vault — a secure in-app pop-up to enter API keys / OAuth secrets.
// You type each value directly into the app; it is written to a local 0600 config
// in the MAIN process (never to chat, never seen by Claude, never sent anywhere
// but the service it belongs to). Auto-opens on first run when Google isn't set up.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGDriveStatus, fetchProtonStatus } from "../api";
import { IcKey, IcFolder, IcSigil, IcPalette, IcLock } from "./icons";

const CONSOLE = "https://console.cloud.google.com/apis/credentials";

export function CredentialsVault({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: g } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 4000 });
  const { data: proton } = useQuery({ queryKey: ["proton"], queryFn: fetchProtonStatus, refetchInterval: 6000 });

  const [gid, setGid] = useState("");
  const [gsecret, setGsecret] = useState("");
  const [pHost, setPHost] = useState("127.0.0.1");
  const [pPort, setPPort] = useState("1143");
  const [pUser, setPUser] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  async function saveGoogle() {
    if (!gid.trim() || !gsecret.trim()) return;
    setBusy("saving Google credentials locally (0600)…");
    await window.dai.gdrive.setClient(gid.trim(), gsecret.trim());
    setGsecret(""); setGid("");                 // never keep secrets in component state
    setBusy(""); qc.invalidateQueries({ queryKey: ["gdrive"] });
  }
  async function signInGoogle() {
    setBusy("opening Google consent in your browser…");
    await window.dai.gdrive.auth();
    setBusy(""); qc.invalidateQueries({ queryKey: ["gdrive"] });
  }
  async function saveProton() {
    setBusy("probing Proton Bridge…");
    await window.dai.proton.setConfig(pHost, Number(pPort) || 1143, pUser.trim());
    setBusy(""); qc.invalidateQueries({ queryKey: ["proton"] });
  }

  const gState = g?.signedIn ? "connected" : g?.configured ? "configured — sign in" : "needs setup";

  return (
    <AnimatePresence>
      <motion.div className="cmdk-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="vault" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}>

          <div className="vault-head">
            <span className="vault-glyph"><IcKey size={22} /></span>
            <div>
              <h2>API Keys &amp; Credentials</h2>
              <div className="vault-sub">You type these into the app — stored locally (chmod 600), never seen by Claude, never sent anywhere but the service itself.</div>
            </div>
            <button className="phone-x" onClick={onClose} title="Close (esc)">esc</button>
          </div>

          <div className="vault-body">
            {/* Google */}
            <section className="vault-card">
              <div className="vault-card-h">
                <span className="vault-ic"><IcFolder size={14} /></span> Google Workspace
                <span className={`vault-badge ${g?.signedIn ? "on" : g?.configured ? "mid" : "off"}`}>{gState}</span>
              </div>
              <div className="vault-steps">
                OAuth client (Desktop app) in <button className="drv-link" onClick={() => window.dai.shell.open(CONSOLE)}>Cloud Console ↗</button>, enable Drive/Sheets/Forms/Gmail APIs, then paste below.
              </div>
              <input className="vault-in" value={gid} onChange={(e) => setGid(e.target.value)} placeholder="Client ID (…apps.googleusercontent.com)" spellCheck={false} autoComplete="off" />
              <input className="vault-in" type="password" value={gsecret} onChange={(e) => setGsecret(e.target.value)} placeholder="Client secret" spellCheck={false} autoComplete="off" />
              <div className="vault-row">
                <button className="drv-btn accent" onClick={saveGoogle} disabled={!gid.trim() || !gsecret.trim()}>Save credentials</button>
                {g?.configured && <button className="drv-btn" onClick={signInGoogle}>{g?.signedIn ? "Re-connect ↗" : "Sign in with Google ↗"}</button>}
                {g?.signedIn && <button className="drv-btn ghost" onClick={() => window.dai.gdrive.signout().then(() => qc.invalidateQueries({ queryKey: ["gdrive"] }))}>Sign out</button>}
              </div>
            </section>

            {/* Proton */}
            <section className="vault-card">
              <div className="vault-card-h">
                <span className="vault-ic"><IcSigil size={14} /></span> Proton Mail (Bridge)
                <span className={`vault-badge ${proton?.bridgeUp ? "on" : "off"}`}>{proton?.bridgeUp ? "bridge up" : "not detected"}</span>
              </div>
              <div className="vault-steps">Needs Proton Mail Bridge running (paid plan). The password stays in the Bridge app — only host/port/username are saved here.</div>
              <div className="vault-row">
                <input className="vault-in slim" value={pHost} onChange={(e) => setPHost(e.target.value)} placeholder="host" />
                <input className="vault-in slim" value={pPort} onChange={(e) => setPPort(e.target.value)} placeholder="port" />
                <input className="vault-in" value={pUser} onChange={(e) => setPUser(e.target.value)} placeholder="Bridge username (email)" spellCheck={false} autoComplete="off" />
              </div>
              <button className="drv-btn accent" onClick={saveProton}>Save + probe</button>
            </section>

            {/* Creative — placeholders (env-file based, honest) */}
            <section className="vault-card">
              <div className="vault-card-h"><span className="vault-ic"><IcPalette size={14} /></span> Creative APIs <span className="vault-badge off">env file</span></div>
              <div className="vault-steps">
                Higgsfield / Canva / Nanobanan / Runway / ElevenLabs keys go in <code>~/.config/dai/creative.json</code>
                (one key per service). A dedicated per-key form lands in the Creative tab — for now this keeps the flow honest (no fake connect).
              </div>
            </section>
          </div>

          <div className="vault-foot">
            <IcLock size={11} /> Every value is written by the main process to <code>~/.config/dai/*.json</code> at <code>chmod 600</code>. Claude never receives, stores, or transmits them.
            {busy && <span className="vault-busy"> · {busy}</span>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
