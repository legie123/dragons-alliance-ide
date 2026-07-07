// Admin Command Center / Tools-merge / Quick Guide verification — CDP asserts +
// the 11 mandated screenshots. Launch the built bundle first on port 9334
// (--user-data-dir=/tmp/dai-cc-qa), then: node scripts/final2-shots.mjs
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
const tab = async (label) => { await js(`[...document.querySelectorAll(".drv-tab")].find(b=>b.textContent.includes("${label}"))?.click(); true`); await sleep(700); };
const checks = []; const ok = (n, p, i = "") => { checks.push({ n, p }); console.log(`${p ? "PASS" : "FAIL"}  ${n}${i ? " — " + i : ""}`); };

await sleep(1800);
// ---- top bar / dock decisions ----
const spTools = await js(`[...document.querySelectorAll(".sp-tools")].map(b=>b.textContent.trim())`);
ok("dock has ONE right button = Admin (Tools retired)", Array.isArray(spTools) && spTools.length === 1 && spTools[0].includes("Admin"), JSON.stringify(spTools));
ok("SYSTEMS chip is a real BUTTON", (await js(`document.querySelector(".tbx-health")?.tagName`)) === "BUTTON");
await shot("final-top-bar-clean.jpg");
await js(`document.querySelector(".tbx-health")?.click(); true`); await sleep(700);
ok("SYSTEMS click opens GODMODE", await js(`!!document.querySelector(".gm")`));
await shot("final-godmode-useful-actions.jpg");
ok("GODMODE has Admin Command Center action", await js(`[...document.querySelectorAll(".gm-actions button")].some(b=>b.textContent.includes("Admin Command Center"))`));
ok("GODMODE has Quick Guide action", await js(`[...document.querySelectorAll(".gm-actions button")].some(b=>b.textContent.includes("Quick Guide"))`));
ok("GODMODE has Run Health Check action", await js(`[...document.querySelectorAll(".gm-actions button")].some(b=>b.textContent.includes("Run Health Check"))`));
await esc();

// ---- Admin Command Center ----
await js(`[...document.querySelectorAll(".sp-tools")].find(b=>b.textContent.includes("Admin"))?.click(); true`); await sleep(1300);
const tabs = await js(`[...document.querySelectorAll(".drv-tab")].map(b=>b.textContent.trim())`);
ok("Admin Command Center has 4 tabs", Array.isArray(tabs) && tabs.length === 4 && tabs.join("|").includes("Tools") && tabs.join("|").includes("Quick Guide"), JSON.stringify(tabs));
await shot("final-admin-command-center.jpg");
await tab("Tools");
const toolCount = await js(`document.querySelectorAll(".lib-tool").length`);
ok("Tools tab: 14 real utility cards", toolCount === 14, `found ${toolCount}`);
await shot("final-admin-tools-section.jpg");
await shot("final-tools-moved-or-fixed.jpg");
await tab("Quick Guide");
const qgText = await js(`document.querySelector(".qg")?.innerText || ""`);
ok("Quick Guide: Cloud tips present", qgText.includes("CLOUD TIPS"));
ok("Quick Guide: Superpowers tips present", qgText.includes("SUPERPOWERS TIPS"));
ok("Quick Guide: troubleshooting present", qgText.includes("TROUBLESHOOTING"));
ok("Quick Guide: copy-paste prompts present", qgText.includes("COPY-PASTE PROMPTS"));
await shot("final-short-tips-cloud.jpg");
await js(`document.querySelector(".qg")?.parentElement?.scrollTo?.(0, 500); [...document.querySelectorAll(".qg-sec")].find(s=>s.textContent.includes("SUPERPOWERS"))?.scrollIntoView({block:"start"}); true`); await sleep(500);
await shot("final-short-tips-superpowers.jpg");

// ---- panels: utility actions + Guide button ----
await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"cloud"})); true`); await sleep(800);
ok("Cloud panel has Cloud Tips action", await js(`[...document.querySelectorAll(".spx-actions button")].some(b=>b.textContent.includes("Cloud Tips"))`));
ok("panel has Guide button", await js(`[...document.querySelectorAll(".spx-actions button")].some(b=>b.textContent.trim()==="Guide")`));
await shot("final-cloud-panel-useful-actions.jpg"); await esc();
await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"graphify"})); true`); await sleep(800);
await shot("final-graphify-panel-useful-actions.jpg"); await esc();
await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"obsidian"})); true`); await sleep(800);
await shot("final-obsidian-panel-useful-actions.jpg"); await esc();

// ---- palette interconnection ----
await js(`window.dispatchEvent(new CustomEvent("dai:palette")); true`); await sleep(700);
await js(`(()=>{const i=document.querySelector(".cmdk-input input");const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;set.call(i,"open ");i.dispatchEvent(new Event("input",{bubbles:true}));return true;})()`); await sleep(500);
const pal = await js(`[...document.querySelectorAll(".cmdk-title")].map(e=>e.textContent)`);
ok("palette: Open Quick Guide", pal?.some((t) => t.includes("Quick Guide")));
ok("palette: Open Tools (Admin)", pal?.some((t) => t.includes("Open Tools")));
ok("palette: Open Graph Digest", pal?.some((t) => t.includes("Graph Digest")));
ok("palette: Open Vault", pal?.some((t) => t.includes("Open Vault")));
await shot("final-command-palette-actions.jpg"); await esc();

ws.close();
const fails = checks.filter((c) => !c.p);
console.log(`\n${checks.length - fails.length}/${checks.length} assertions passed`);
process.exit(fails.length ? 1 : 0);
