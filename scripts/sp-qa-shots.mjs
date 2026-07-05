#!/usr/bin/env node
// Superpowers-repair QA driver — attaches over CDP (:9333) to a running app and
// captures the dock feedback flow: dock baseline, Ruflo Ignite toast, graphify
// digest toast, google setup state, GODMODE open. Reuses the ui-shots CDP pattern.
//
// Usage: node scripts/sp-qa-shots.mjs [outDir]
//   app must run:  npx electron out/main/index.js --remote-debugging-port=9333 --user-data-dir=/tmp/dai-sp-qa
import { WebSocket } from "ws";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "docs/screenshots";
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
const evaluate = (expression) =>
  send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });

async function shot(name) {
  await sleep(500);
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  const file = join(OUT, `${name}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("captured", file);
}
const key = (k, meta = false) =>
  evaluate(`window.dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(k)},metaKey:${meta},bubbles:true}))`);

// click a superpower chip by its visible name (aria-label starts with "<Name> ")
const clickChip = (name) =>
  evaluate(`(()=>{const b=[...document.querySelectorAll('.sp-chip')].find(e=>(e.getAttribute('aria-label')||'').startsWith(${JSON.stringify(name + " ")}));if(!b)return 'MISS chip '+${JSON.stringify(name)};b.click();return 'ok'})()`);
// click a quick-action button whose text contains `text`
const clickAct = (text) =>
  evaluate(`(()=>{const b=[...document.querySelectorAll('.sp-act')].find(e=>(e.textContent||'').includes(${JSON.stringify(text)}));if(!b)return 'MISS act '+${JSON.stringify(text)};b.click();return 'ok'})()`);
const toastText = () =>
  evaluate(`(()=>{const t=[...document.querySelectorAll('.toast')];return t.length?t.map(x=>x.className.replace('toast ','')+': '+(x.querySelector('.toast-title')?.textContent||'')).join(' | '):'NO TOAST'})()`);

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
  await sleep(2800); // first paint + probes

  // dismiss first-run credentials vault (Escape honored by drawers)
  await key("Escape"); await sleep(250);
  await key("Escape"); await sleep(400);

  // 1) dock baseline
  await evaluate(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"ide"}))`);
  await sleep(500);
  await shot("superpowers-before");

  // 2) Ruflo Ignite → CHECKING then honest result toast
  console.log("ruflo chip:", await clickChip("Ruflo"));
  await sleep(400);
  console.log("ignite:", await clickAct("Ignite"));
  await sleep(700);
  console.log("toast(checking):", await toastText());
  await sleep(3200); // let ruflo status resolve
  console.log("toast(result):", await toastText());
  await shot("ruflo-after-ignite");
  await key("Escape"); await sleep(400);

  // 3) health snapshot of the whole dock after the probe refreshed
  await shot("superpowers-after-health");

  // 4) Grapevine → Open Graph Digest toast
  console.log("grapevine chip:", await clickChip("Grapevine"));
  await sleep(400);
  console.log("open digest:", await clickAct("Open Graph Digest"));
  await sleep(1400);
  console.log("toast(digest):", await toastText());
  await shot("graphify-health-test");
  await key("Escape"); await sleep(400);

  // 5) Google APIs — honest setup-required state
  console.log("google chip:", await clickChip("Google APIs"));
  await sleep(500);
  await shot("google-setup-test");
  await key("Escape"); await sleep(400);

  // 6) GODMODE opens its panel
  console.log("godmode chip:", await clickChip("GODMODE"));
  await sleep(900);
  await shot("godmode-open");

  ws.close();
  console.log("done:", OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
