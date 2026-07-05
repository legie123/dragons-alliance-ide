#!/usr/bin/env node
// NeuroMap team-ops screenshot driver — attaches over CDP (:9333) to a running
// app and captures the design-QA shots. Drives only UI the app itself exposes:
// dai:goto navigation, real DOM clicks on toolbar buttons, and wheel events on
// the canvas to prove the smart labels stay legible at full zoom-out.
//
// Usage:  node scripts/nm-shots.mjs [outDir]
//   app must run:  npx electron out/main/index.js --remote-debugging-port=9333 --user-data-dir=/tmp/dai-nm-qa
import { WebSocket } from "ws";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "docs/screenshots";
const PREFIX = "neuromap";
const CDP = "http://127.0.0.1:9333";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await (await fetch(`${CDP}/json/list`)).json();
      const page = list.find((t) => t.type === "page" && !/devtools/.test(t.url));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* booting */ }
    await sleep(1000);
  }
  throw new Error("no CDP page target on :9333");
}

let seq = 0;
const pending = new Map();
let ws;
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const evaluate = (expression) => send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });

async function shot(name) {
  await sleep(700);
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  const file = join(OUT, `${PREFIX}-${name}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("captured", file);
}

const goto = (v) => evaluate(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"${v}"}))`);
const key = (k, meta = false) => evaluate(`window.dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(k)},metaKey:${meta},bubbles:true}))`);
// click a toolbar button by its exact (trimmed, lowercased) text
const clickText = (text) => evaluate(`(()=>{const b=[...document.querySelectorAll('.nm-toolbar button')].find(x=>x.textContent.trim().toLowerCase()===${JSON.stringify(text.toLowerCase())});if(!b)return 'MISS '+${JSON.stringify(text)};b.click();return 'ok'})()`);
const wheel = (dy) => evaluate(`(()=>{const c=document.querySelector('.nm-canvas');if(!c)return 'no canvas';c.dispatchEvent(new WheelEvent('wheel',{deltaY:${dy},bubbles:true,cancelable:true}));return 'ok'})()`);
const clickNode = () => evaluate(`(()=>{const g=[...document.querySelectorAll('.nm-canvas g[role=button]')];if(!g.length)return 'no node';g[Math.min(3,g.length-1)].dispatchEvent(new MouseEvent('click',{bubbles:true}));return 'ok'})()`);
async function closePalette() { const open = await evaluate(`!!document.querySelector('input[placeholder*="Jump"]')`); if (open) { await key("k", true); await sleep(300); } }

async function main() {
  mkdirSync(OUT, { recursive: true });
  ws = new WebSocket(await target(), { maxPayload: 64 * 1024 * 1024 });
  await new Promise((r) => ws.once("open", r));
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result?.result?.value ?? m.result);
    }
  });
  await send("Page.enable");
  await sleep(2500);
  await key("Escape"); await sleep(250);
  await key("Escape"); await sleep(250);
  await closePalette();

  await goto("neuromap"); await sleep(900);
  await clickText("all");                              // widest layer = most nodes to stress labels
  await shot("baseline");

  // THE headline test: zoom fully out — smart labels must NOT become soup
  for (let i = 0; i < 5; i++) { await wheel(320); await sleep(120); }
  await shot("smart-labels-zoomout");
  console.log("reset:", await clickText("reset"));

  console.log("team:", await clickText("team"));      await shot("team-mode");
  console.log("files:", await clickText("files"));    await shot("file-discovery");
  console.log("activity:", await clickText("activity")); await shot("activity-mode");
  console.log("clean:", await clickText("clean"));    await shot("clean-mode");

  // selected node → inspector (Knowledge mode for a rich node)
  console.log("knowledge:", await clickText("knowledge"));
  await sleep(500);
  console.log("node:", await clickNode());
  await shot("selected-file-inspector");

  console.log("diag:", await clickText("diag"));      await shot("diagnostics");
  console.log("diag off:", await clickText("diag"));

  // honest empty-state: Tasks in the core layer has no task notes → pending overlay
  console.log("core:", await clickText("core"));
  console.log("tasks:", await clickText("tasks"));
  await shot("empty-state");

  ws.close();
  console.log("done:", OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
