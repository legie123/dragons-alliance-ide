#!/usr/bin/env node
// Verifies the three design-QA fixes against the RUNNING app (CDP :9333):
//  1. palette closes on Escape even when the input lost focus
//  2. dock quick panel shows "last check" meta line
//  3. GODMODE goal % renders rounded
import { WebSocket } from "ws";
import { mkdirSync, writeFileSync } from "node:fs";

const CDP = "http://127.0.0.1:9333";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0; const pending = new Map(); let ws;
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
};
const ev = (expression) => send("Runtime.evaluate", { expression, returnByValue: true });
const val = async (x) => (await ev(x)).result?.value;
const key = (k, meta = false) => ev(`window.dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(k)},metaKey:${meta},bubbles:true}))`);
const shot = async (name) => {
  await sleep(500);
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(`docs/screenshots/${name}.jpg`, Buffer.from(data, "base64"));
  console.log("captured docs/screenshots/" + name + ".jpg");
};

const list = await (await fetch(`${CDP}/json/list`)).json();
const page = list.find((t) => t.type === "page" && !/devtools/.test(t.url));
ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
await new Promise((r) => ws.once("open", r));
ws.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
});
await send("Page.enable");
await sleep(3000);
await key("Escape"); await sleep(250); await key("Escape"); await sleep(250);

// -- 1. palette Escape (unfocused) --
await key("k", true); await sleep(400);
await ev(`document.querySelector('input[placeholder*="Jump"]')?.blur()`);
await key("Escape"); await sleep(350);
const stillOpen = await val(`!!document.querySelector('input[placeholder*="Jump"]')`);
console.log("TEST palette-escape-unfocused:", stillOpen ? "FAIL (still open)" : "PASS");

// -- 2. dock panel meta line --
await ev(`[...document.querySelectorAll(".sp-chip")].find(b=>/Obsidian/.test(b.textContent))?.click()`);
await sleep(400);
const meta = await val(`document.querySelector(".sp-panel-meta")?.textContent ?? null`);
console.log("TEST dock-panel-meta:", meta ? `PASS (${meta})` : "FAIL (missing)");
mkdirSync("docs/screenshots", { recursive: true });
await shot("fable-ui-superpowers-dock");
await key("Escape"); await sleep(250);

// -- 3. GODMODE rounded goal --
await ev(`window.dispatchEvent(new CustomEvent("dai:godmode"))`); await sleep(600);
const goal = await val(`(document.body.textContent.match(/goal [\\d.]+%/)||[null])[0]`);
console.log("TEST godmode-goal-rounded:", goal === null ? "SKIP (no live mission)" : /goal \d+%/.test(goal) ? `PASS (${goal})` : `FAIL (${goal})`);
await shot("fable-ui-godmode");
await key("Escape");

ws.close();
