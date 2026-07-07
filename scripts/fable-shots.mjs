// Fable construction QA — CDP behavioral smoke + screenshot capture.
// Launch the built bundle first:
//   node_modules/electron/dist/Electron.app/Contents/MacOS/Electron out/main/index.js \
//     --remote-debugging-port=9334 --user-data-dir=/tmp/dai-fable-qa
// Then: node scripts/fable-shots.mjs
// Asserts critical buttons behaviorally (real effects, not pixels) and writes
// docs/screenshots/fable-build-*.jpg. Exits non-zero on any failed assertion.
import { WebSocket } from "ws";
import { writeFileSync, mkdirSync } from "node:fs";

const PORT = process.env.CDP_PORT || 9334;
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
if (!page) { console.error("no page target — app not running with CDP?"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 128 * 1024 * 1024 });
let seq = 0; const pend = new Map();
await new Promise((r) => ws.once("open", r));
ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((r) => pend.set(id, r)); };
await send("Runtime.enable"); await send("Page.enable");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = async (expr, awaitPromise = false) =>
  (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise })).result?.result?.value;
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(`${OUT}/${name}`, Buffer.from(r.result.data, "base64"));
  console.log("shot:", name);
};
const nav = async (v, wait = 1500) => { await js(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"${v}"})); true`); await sleep(wait); };
const openPanel = async (id, wait = 900) => { await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"${id}"})); true`); await sleep(wait); };
const esc = async () => { await js(`window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"})); true`); await sleep(400); };
const clickByText = (scope, text) =>
  js(`(()=>{const b=[...document.querySelectorAll("${scope} button")].find(x=>x.textContent.includes("${text}"));if(!b||b.disabled)return false;b.click();return true;})()`);

const checks = []; const ok = (name, pass, info = "") => { checks.push({ name, pass, info }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${info ? " — " + info : ""}`); };

// ---- baseline ----
await sleep(1500);
ok("react mounts", (await js(`(document.getElementById("root")||document.body).innerHTML.length`)) > 200);
ok("dock has 7 superpower chips", (await js(`document.querySelectorAll(".sp-chip").length`)) === 7);
ok("zero 'Grapevine' in UI", !(await js(`document.body.innerText.includes("Grapevine")`)));
ok("terminals bridge live", Array.isArray(await js(`window.dai.term.list()`, true)));

// ---- sectors ----
await nav("ide", 2500); await shot("fable-build-terminal.jpg");
await shot("fable-build-superpowers-dock.jpg"); // dock visible on the terminal deck
await nav("agents", 1800); await shot("fable-build-agents-sector.jpg");
await nav("neuromap", 3200); await shot("fable-build-neuromap.jpg");

// ---- P0-1 behavioral: Micro Terminal Run spawns a REAL terminal ----
await nav("preview", 1500);
const proj = await js(`(()=>{const s=document.querySelector(".pv-sel");const opt=[...s.options].find(o=>o.value.includes("dragons-alliance-ide"))||s.options[1];if(!opt)return null;
  const set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,"value").set;set.call(s,opt.value);s.dispatchEvent(new Event("change",{bubbles:true}));return opt.value;})()`);
await sleep(400);
await js(`(()=>{const i=document.querySelector(".pv-micro-in input");const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(i,"echo DAI-SMOKE-OK");i.dispatchEvent(new Event("input",{bubbles:true}));return true;})()`);
await sleep(300);
await shot("fable-build-preview.jpg"); // armed micro terminal, pre-run
const before = (await js(`window.dai.term.list()`, true))?.length ?? 0;
const clicked = await js(`(()=>{const b=document.querySelector(".pv-micro-in button");if(!b||b.disabled)return false;b.click();return true;})()`);
await sleep(2200);
const after = await js(`window.dai.term.list()`, true);
const spawned = (after?.length ?? 0) > before && after.some((t) => proj && t.cwd === proj);
ok("P0-1 Micro Terminal Run spawns real terminal in project cwd", !!clicked && spawned, `terms ${before}→${after?.length}`);

// ---- library / palette / godmode ----
await nav("library", 1500); await shot("fable-build-admin-library.jpg");
await js(`window.dispatchEvent(new KeyboardEvent("keydown",{key:"k",metaKey:true})); true`); await sleep(700);
await shot("fable-build-command-palette.jpg"); await esc();
await js(`window.dispatchEvent(new CustomEvent("dai:godmode")); true`); await sleep(800);
await shot("fable-build-godmode-panel.jpg"); await esc();

// ---- superpower panels (real diagnostics clicked where present) ----
await openPanel("ruflo");
await clickByText(".spx-diag", "Run health check");
await sleep(9500); // real `ruflo status` + `ruflo task list` (6s guard each, sequential)
const rufloDiag = await js(`document.querySelector(".spx-diag-out")?.innerText || ""`);
ok("P1-B ruflo panel shows real queue line", rufloDiag.includes("task queue:"), rufloDiag.split("\n").slice(-1)[0]);
await shot("fable-build-rooflow-panel.jpg"); await esc();

await openPanel("graphify");
await clickByText(".spx-diag", "Run health check"); await sleep(1500);
await shot("fable-build-graphify-panel.jpg"); await esc();

await openPanel("obsidian");
await clickByText(".spx-diag", "Run diagnostics"); await sleep(1500);
await shot("fable-build-obsidian-panel.jpg"); await esc();

await openPanel("agents");
await clickByText(".spx-diag", "Run diagnostics"); await sleep(1500);
await shot("fable-build-agents-panel.jpg"); await esc();

ws.close();
const fails = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - fails.length}/${checks.length} assertions passed`);
process.exit(fails.length ? 1 : 0);
