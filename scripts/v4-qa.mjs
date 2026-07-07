// v4 QA — DoD: the Guide Sector Agent answers via LOCAL Hermes (Ollama). Plus
// LLM Hub, Power Center, browsers, metrics ≤100. Launch bundle on :9334 first.
import { WebSocket } from "ws";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = "docs/screenshots"; mkdirSync(OUT, { recursive: true });
const page = (await (await fetch("http://127.0.0.1:9334/json/list")).json()).find((t) => t.type === "page");
if (!page) { console.error("no page"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 128 << 20 });
let s = 0; const p = new Map();
await new Promise((r) => ws.once("open", r));
ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } });
const send = (m, pr = {}) => { const i = ++s; ws.send(JSON.stringify({ id: i, method: m, params: pr })); return new Promise((r) => p.set(i, r)); };
await send("Runtime.enable"); await send("Page.enable");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const js = async (e, ap = false) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: ap })).result?.result?.value;
const shot = async (n) => { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }); writeFileSync(`${OUT}/${n}`, Buffer.from(r.result.data, "base64")); console.log("shot:", n); };
const esc = async () => { await js(`window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"})); true`); await sleep(400); };
const checks = []; const ok = (n, pass, i = "") => { checks.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${n}${i ? " — " + i : ""}`); };

await sleep(2000);
// 8 superpowers now
ok("dock has 8 chips (LLM Hub added)", (await js(`document.querySelectorAll(".sp-chip").length`)) === 8);
ok("LLM Hub chip present", await js(`[...document.querySelectorAll(".sp-name")].some(e=>e.textContent==="LLM Hub")`));
ok("dock shows RuFlo + Claude", await js(`[...document.querySelectorAll(".sp-name")].every(e=>e.textContent!=="Agent Rooflow"&&e.textContent!=="Cloud")`));

// LLM Hub panel + real diagnostics
await js(`window.dispatchEvent(new CustomEvent("dai:superpower",{detail:"llmhub"})); true`); await sleep(900);
await js(`[...document.querySelectorAll(".spx-diag button")].find(b=>/diagnostics|health/i.test(b.textContent))?.click(); true`); await sleep(4500);
const hub = await js(`document.querySelector(".spx-diag-out")?.innerText || ""`);
ok("LLM Hub diag: Ollama active w/ real models", /Ollama \(local\): active/.test(hub) && /hermes/i.test(hub), hub.split("\n")[0]);
ok("LLM Hub diag: keyed providers honest setup", /setup required|setup_required/.test(hub.replace(/_/g, " ")));
await shot("llm-hub-active-providers.jpg"); await esc();

// Power Center opens for real
await js(`window.dispatchEvent(new CustomEvent("dai:admin",{detail:"powercenter"})); true`); await sleep(1400);
const pcText = await js(`document.body.innerText`);
ok("Power Center renders (not appearance fallback)", pcText.includes("API Power Center") && /stored 0600|masked/i.test(pcText));
await shot("settings-api-power-center.jpg"); await esc();

// ===== DoD: Guide Sector Agent answers via LOCAL Hermes =====
await js(`window.dispatchEvent(new CustomEvent("dai:sector-agent",{detail:"guide"})); true`); await sleep(1600);
ok("Guide agent opens with the tour question", await js(`document.querySelector(".sga-assistant")?.textContent.includes("tur rapid")`));
await js(`(()=>{const i=document.querySelector(".sga-in input");const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;set.call(i,"Ce este GODMODE? Raspunde intr-o singura propozitie.");i.dispatchEvent(new Event("input",{bubbles:true}));return true;})()`);
await sleep(300);
await js(`[...document.querySelectorAll(".sga-in button")].find(b=>b.textContent==="Send")?.click(); true`);
let reply = ""; const t0 = Date.now();
while (Date.now() - t0 < 75000) {
  await sleep(2500);
  const lines = await js(`[...document.querySelectorAll(".sga-line")].map(e=>({c:e.className,t:e.textContent}))`);
  const asst = (lines || []).filter((l) => l.c.includes("sga-assistant") && !l.c.includes("busy"));
  const err = (lines || []).find((l) => l.c.includes("sga-err"));
  if (err) { reply = "ERR:" + err.t; break; }
  if (asst.length >= 2) { reply = asst[asst.length - 1].t; break; }
}
ok("DoD: Hermes answered the Guide chat FOR REAL", reply.length > 15 && !reply.startsWith("ERR:"), reply.slice(0, 110));
await shot("guide-chatbot-tour.jpg");
await shot("sector-agent-guide-real-reply.jpg"); await esc();

// Sector agent from StatusBar on a sector (code)
await js(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"code"})); true`); await sleep(900);
await js(`document.querySelector(".sbar-btn")?.click(); true`); await sleep(1200);
ok("StatusBar opens Code sector agent", await js(`document.querySelector(".sga-title")?.textContent.includes("Code")`));
await shot("sector-agent-terminal-code.jpg"); await esc();

// Preview browsers row (real detection)
await js(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"preview"})); true`); await sleep(1600);
const pvTxt = await js(`document.body.innerText`);
ok("Preview shows detected browsers", /Open in (Google Chrome|Brave|Firefox)/.test(pvTxt) && /System default/.test(pvTxt));
ok("Preview login-safe note", /sign in manually/i.test(pvTxt));
await shot("preview-browser-detection.jpg");

// Metrics: capacity ≤100 displayed
await js(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"metrics"})); true`); await sleep(2200);
const caps = await js(`[...document.querySelectorAll(".metrics-view *")].filter(e=>e.childElementCount===0&&/^capacity/i.test(e.textContent||"")).map(e=>e.parentElement?.textContent||"").slice(0,4)`);
ok("Metrics capacity displayed ≤100%", (caps || []).every((c) => { const m = c.match(/(\d+(?:\.\d+)?)%/); return !m || parseFloat(m[1]) <= 100; }), JSON.stringify(caps));
await shot("metrics-dragon-smoke.jpg");

ws.close();
const fails = checks.filter((c) => !c).length;
console.log(`\n${checks.length - fails}/${checks.length} passed`);
process.exit(fails ? 1 : 0);
