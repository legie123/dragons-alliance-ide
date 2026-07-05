#!/usr/bin/env node
// UI screenshot driver — attaches to a running app instance over CDP (:9333)
// and captures the shots the design-QA process requires. Never touches app state
// beyond navigation events the UI itself exposes (dai:goto / real DOM clicks).
//
// Usage:  node scripts/ui-shots.mjs [outDir] [prefix]
//   app must be running:  npx electron out/main/index.js --remote-debugging-port=9333
import { WebSocket } from "ws";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "docs/screenshots";
const PREFIX = process.argv[3] ?? "fable-ui";
const CDP = "http://127.0.0.1:9333";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await (await fetch(`${CDP}/json/list`)).json();
      const page = list.find((t) => t.type === "page" && !/devtools/.test(t.url));
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* app still booting */ }
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
  await sleep(650); // settle animations/queries
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  const file = join(OUT, `${PREFIX}-${name}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("captured", file);
}

const goto = (v) => evaluate(`window.dispatchEvent(new CustomEvent("dai:goto",{detail:"${v}"}))`);
const click = (sel) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return "MISS: "+${JSON.stringify(sel)};el.click();return "ok"})()`);
const key = (k, meta = true) =>
  evaluate(`window.dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(k)},metaKey:${meta},bubbles:true}))`);

// The palette toggles on ⌘K and does NOT close on Escape — detect and toggle.
async function closePalette() {
  const open = await evaluate(`!!document.querySelector('input[placeholder*="Jump"]')`);
  if (open) { await key("k"); await sleep(300); }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const url = await target();
  ws = new WebSocket(url, { maxPayload: 64 * 1024 * 1024 });
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
  await sleep(2500); // first paint + health probes

  // close the first-run credentials vault if it auto-opened (Escape is honored
  // by every drawer/modal via useEscape). Twice, in case two layers stacked.
  await key("Escape", false); await sleep(250);
  await key("Escape", false); await sleep(250);
  await closePalette();

  await goto("ide");       await shot("baseline");
  await shot("left-top-right-bottom"); // same frame doubles as layout proof
  await shot("terminal");
  await goto("agents");    await shot("agents");
  await goto("neuromap");  await shot("neuromap");
  await goto("drive");     await shot("drive");
  await goto("metrics");   await shot("metrics");
  await goto("preview");   await shot("preview");
  await goto("creative");  await shot("creative");
  await goto("code");      await sleep(1500); await shot("code");

  // superpowers dock — hover panel proof (open first dock card's panel if clickable)
  await goto("ide");
  console.log(await click(".dock-card, .eco-pill, [class*=dock] button"));
  await shot("superpowers-dock");
  await key("Escape", false);

  // dragon guide
  console.log(await click('[aria-label*="guide" i], [title*="guide" i]'));
  await shot("dragon-guide");
  await key("Escape", false);
  await sleep(300);

  // settings
  await evaluate(`window.dispatchEvent(new CustomEvent("dai:admin",{detail:"settings"}))`);
  await shot("settings");
  await key("Escape", false);
  await sleep(300);

  // godmode
  await evaluate(`window.dispatchEvent(new CustomEvent("dai:godmode"))`);
  await shot("godmode");
  await key("Escape", false);
  await sleep(300);

  // command palette
  await key("k");
  await shot("command-palette");
  await closePalette();

  // smart empty state — preview deck with nothing mounted is the canonical one
  await goto("preview");
  await shot("smart-empty-state");

  ws.close();
  console.log("done:", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
