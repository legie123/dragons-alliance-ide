// FINAL verification — Superpowers/Admin/Tools rebuild. CDP behavioral asserts +
// the 13 mandated screenshots. Launch the built bundle first:
//   node_modules/electron/.../Electron out/main/index.js --remote-debugging-port=9334 --user-data-dir=/tmp/dai-final-qa
// Then: node scripts/final-shots.mjs   (exits non-zero on any failed assertion)
import { WebSocket } from "ws";
import { writeFileSync, mkdirSync } from "node:fs";

const PORT = process.env.CDP_PORT || 9334;
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
if (!page) { console.error("no page target"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 128 * 1024 * 1024 });
let seq = 0; const pend = new Map();
await new Promise((r) => ws.once("open", r));
ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (m, p = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method: m, params: p })); return new Promise((r) => pend.set(id, r)); };
await send("Runtime.enable"); await send("Page.enable");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = async (e, ap = false) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: ap })).result?.result?.value;
const shot = async (n) => { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }); writeFileSync(`${OUT}/${n}`, Buffer.from(r.result.data, "base64")); console.log("shot:", n); };
const esc = async () => { await js(`window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"})); true`); await sleep(450); };
const openPanel = async (id, w = 900) => { await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"${id}"})); true`); await sleep(w); };
const panelOpen = () => js(`!!document.querySelector(".spx")`);
const clickAction = (text) => js(`(()=>{const b=[...document.querySelectorAll(".spx-actions button")].find(x=>x.textContent.trim().startsWith("${text}"));if(!b||b.disabled)return false;b.click();return true;})()`);
const checks = []; const ok = (n, p, i = "") => { checks.push({ n, p }); console.log(`${p ? "PASS" : "FAIL"}  ${n}${i ? " — " + i : ""}`); };

await sleep(1800);
// ---- dock truth ----
ok("7 chips", (await js(`document.querySelectorAll(".sp-chip").length`)) === 7);
ok("zero Grapevine in UI", !(await js(`document.body.innerText.includes("Grapevine")`)));
ok("dock shows Agent Rooflow", await js(`[...document.querySelectorAll(".sp-name")].some(e=>e.textContent==="Agent Rooflow")`));
ok("dock shows Graphify", await js(`[...document.querySelectorAll(".sp-name")].some(e=>e.textContent==="Graphify")`));
ok("Admin Library button labeled", await js(`[...document.querySelectorAll(".sp-tools")].some(b=>b.textContent.includes("Admin Library"))`));
await shot("final-superpowers-dock.jpg");

// ---- every non-god chip click opens its panel ----
for (const id of ["ruflo", "agents", "cloud", "graphify", "obsidian", "google"]) {
  await js(`[...document.querySelectorAll(".sp-chip")].find(c=>!c.classList.contains("god") && c.getAttribute("aria-label")?.toLowerCase().startsWith("${id === "ruflo" ? "agent rooflow" : id === "google" ? "google apis" : id}"))?.click(); true`);
  await sleep(700);
  ok(`chip ${id} opens panel`, await panelOpen());
  await esc();
}
await js(`[...document.querySelectorAll(".sp-chip")].find(c=>c.classList.contains("god"))?.click(); true`); await sleep(700);
ok("GODMODE chip opens GODMODE", await js(`!!document.querySelector(".gm")`));
await shot("final-godmode-panel.jpg"); await esc();

// ---- Rooflow panel: real health incl. queue line ----
await openPanel("ruflo");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent.includes("health"))?.click(); true`);
await sleep(9500);
const diag = await js(`document.querySelector(".spx-diag-out")?.innerText || ""`);
ok("Rooflow diag has real queue line", diag.includes("task queue:"), diag.split("\n").pop());
ok("Rooflow Reflow honest-disabled", await js(`(()=>{const b=[...document.querySelectorAll(".spx-actions button")].find(x=>x.textContent.includes("Reflow"));return !!b && b.disabled && !!b.title;})()`));
await shot("final-agent-rooflow-panel.jpg"); await esc();

// ---- Graphify panel: shot, then Open Map → REAL Neuromap (+ Inspect Graph diag) ----
await openPanel("graphify");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent.includes("health"))?.click(); true`); await sleep(1600);
await shot("final-graphify-panel.jpg");
ok("Graphify Open Map clicked", await clickAction("Open Map")); await sleep(1400);
ok("→ landed in Neuromap", await js(`!!document.querySelector(".nm-btn, .nm-view, [class*='nm-']")`));
await shot("final-neuromap-opened-from-graphify.jpg");
// Inspect Graph: reopen panel, click, expect Neuromap WITH diagnostics open
await openPanel("graphify"); ok("Graphify Inspect Graph clicked", await clickAction("Inspect Graph")); await sleep(1600);
ok("→ Neuromap diagnostics visible", await js(`!!document.querySelector(".nm-diag, [class*='nm-diag']") || [...document.querySelectorAll("button")].some(b=>b.classList.contains("on")&&b.textContent.includes("Diag"))`));

// ---- Obsidian panel: shot, then Open Drive → REAL Drive sector ----
await openPanel("obsidian");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent.includes("diagnostics")||b.textContent.includes("health"))?.click(); true`); await sleep(1600);
await shot("final-obsidian-panel.jpg");
ok("Obsidian Open Drive clicked", await clickAction("Open Drive")); await sleep(1400);
ok("→ landed in Drive", await js(`!!document.querySelector(".drv-view")`));
await shot("final-drive-opened-from-obsidian.jpg");

// ---- Agents / Cloud / Google panels ----
await openPanel("agents");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent)?.click(); true`); await sleep(1200);
ok("Agents Assign Sector honest-disabled", await js(`(()=>{const b=[...document.querySelectorAll(".spx-actions button")].find(x=>x.textContent.includes("Assign Sector"));return !!b && b.disabled && !!b.title;})()`));
await shot("final-agents-panel.jpg"); await esc();
await openPanel("cloud");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent)?.click(); true`); await sleep(1200);
ok("Cloud Continue honest-disabled", await js(`(()=>{const b=[...document.querySelectorAll(".spx-actions button")].find(x=>x.textContent.includes("Continue Session"));return !!b && b.disabled && !!b.title;})()`));
await shot("final-cloud-panel.jpg"); await esc();
await openPanel("google");
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>b.textContent)?.click(); true`); await sleep(1400);
ok("Google has real Sign in action", await js(`(()=>{const b=[...document.querySelectorAll(".spx-actions button")].find(x=>x.textContent.includes("Sign in with Google"));return !!b && !b.disabled;})()`));
await shot("final-google-apis-panel.jpg"); await esc();

// ---- Admin Library / Tools / Palette ----
await js(`[...document.querySelectorAll(".sp-tools")].find(b=>b.textContent.includes("Admin Library"))?.click(); true`); await sleep(1300);
ok("Admin → Admin Library w/ subtitle", await js(`document.body.innerText.includes("Admin Library") && document.body.innerText.includes("Operational Modules")`));
ok("Control Room band present", await js(`document.body.innerText.toLowerCase().includes("control room")`));
await shot("final-admin-library.jpg");
await js(`window.dispatchEvent(new CustomEvent("dai:more")); true`); await sleep(800);
ok("Tools menu shows OPERATIONS", await js(`document.body.innerText.includes("OPERATIONS") && document.body.innerText.includes("Health Check")`));
await shot("final-tools-menu.jpg"); await esc();
await js(`window.dispatchEvent(new CustomEvent("dai:palette")); true`); await sleep(700);
ok("dai:palette opens palette", await js(`!!document.querySelector(".cmdk")`));
await shot("final-command-palette.jpg"); await esc();

ws.close();
const fails = checks.filter((c) => !c.p);
console.log(`\n${checks.length - fails.length}/${checks.length} assertions passed`);
process.exit(fails.length ? 1 : 0);
