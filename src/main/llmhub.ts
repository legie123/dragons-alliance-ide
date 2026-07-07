// LLM Hub — real provider detection, connection tests and LOCAL CHAT (Electron main).
//
// Honesty rules (non-negotiable): a provider is ACTIVE only when a REAL probe
// proves it (Ollama HTTP, CLI on disk). A stored API key alone = "configured"
// (never "active" — we don't burn tokens probing paid APIs on an interval; Test
// Connection does that on demand). No key/endpoint = "setup_required". Keys live
// ONLY here (0600 file), never returned to the renderer — status carries just
// hasKey + last4. Chat runs against the LOCAL Ollama server — no cloud, no keys.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { auditLog } from "./audit.js";
import type { LlmProviderStatus, LlmHubStatus, LlmTestResult, LlmChatMsg, LlmChatResult } from "../shared/ipc.js";

const execFileP = promisify(execFile);
const HOME = os.homedir();
const CFG = path.join(HOME, ".config", "dai", "llm.json");
const OLLAMA = "http://127.0.0.1:11434";

type LlmCfg = Record<string, { key?: string; endpoint?: string; model?: string }>;

function readCfg(): LlmCfg {
  try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return {}; }
}
function writeCfg(cfg: LlmCfg) {
  fs.mkdirSync(path.dirname(CFG), { recursive: true });
  fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  try { fs.chmodSync(CFG, 0o600); } catch { /* best effort */ }
}
const mask = (k?: string) => (k ? `••••${k.slice(-4)}` : undefined);

function binExists(names: string[]): boolean {
  for (const n of names) {
    for (const dir of ["/opt/homebrew/bin", "/usr/local/bin", path.join(HOME, ".local", "bin"), path.join(HOME, ".npm-global", "bin")]) {
      try { if (fs.existsSync(path.join(dir, n))) return true; } catch { /* skip */ }
    }
  }
  return false;
}

async function ollamaTags(): Promise<{ up: boolean; models: string[] }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { up: false, models: [] };
    const j = (await r.json()) as { models?: { name: string }[] };
    return { up: true, models: (j.models ?? []).map((m) => m.name) };
  } catch { return { up: false, models: [] }; }
}

/** Full hub status — every state backed by a real probe or an honest "configured". */
export async function llmStatus(): Promise<LlmHubStatus> {
  const cfg = readCfg();
  const tags = await ollamaTags();
  const hermesModels = tags.models.filter((m) => /hermes/i.test(m));
  const claudeCli = binExists(["claude"]);

  const P = (p: Partial<LlmProviderStatus> & Pick<LlmProviderStatus, "id" | "label" | "state">): LlmProviderStatus => ({
    models: [], hasKey: false, keyMasked: undefined, endpoint: undefined, detail: "", ...p,
  });

  const keyed = (id: string, label: string, detail: string): LlmProviderStatus =>
    P(cfg[id]?.key
      ? { id, label, state: "configured", hasKey: true, keyMasked: mask(cfg[id]!.key), detail: `${detail} — key saved, Test Connection to verify` }
      : { id, label, state: "setup_required", detail: `${detail} — add an API key in Settings ▸ API Power Center` });

  const providers: LlmProviderStatus[] = [
    P(tags.up
      ? { id: "ollama", label: "Ollama (local)", state: "active", models: tags.models, endpoint: OLLAMA, detail: `${tags.models.length} model(s) on localhost:11434` }
      : { id: "ollama", label: "Ollama (local)", state: "setup_required", endpoint: OLLAMA, detail: "server not responding on 11434 — start ollama" }),
    P(tags.up && hermesModels.length
      ? { id: "hermes-local", label: "Hermes (local)", state: "active", models: hermesModels, endpoint: OLLAMA, detail: `${hermesModels.length} Hermes model(s) via Ollama` }
      : { id: "hermes-local", label: "Hermes (local)", state: "setup_required", detail: tags.up ? "no hermes model pulled — `ollama pull hermes...`" : "needs the local Ollama server" }),
    P(claudeCli
      ? { id: "claude-cli", label: "Claude Code (CLI)", state: "active", models: ["claude (terminal sessions)"], detail: "CLI on PATH — sessions run in the Terminal deck" }
      : { id: "claude-cli", label: "Claude Code (CLI)", state: "setup_required", detail: "claude CLI not found on PATH" }),
    keyed("anthropic", "Anthropic API", "direct API"),
    keyed("openai", "OpenAI", "GPT APIs"),
    keyed("gemini", "Gemini / Google AI", "generativelanguage API"),
    keyed("gamma", "Gamma", "no SDK integrated yet"),
    keyed("gin", "GIN", "no SDK integrated yet"),
    P(cfg.custom?.endpoint
      ? { id: "custom", label: "Custom provider", state: "configured", endpoint: cfg.custom.endpoint, hasKey: !!cfg.custom.key, keyMasked: mask(cfg.custom.key), detail: "endpoint saved — Test Connection to verify" }
      : { id: "custom", label: "Custom provider", state: "setup_required", detail: "set an endpoint in Settings ▸ API Power Center" }),
  ];

  return {
    providers,
    active: providers.filter((p) => p.state === "active").length,
    configured: providers.filter((p) => p.state === "configured").length,
    checkedAt: Date.now(),
  };
}

/** Save provider config (key/endpoint/model). Never echoes the key back. */
export async function llmSet(provider: string, patch: { key?: string; endpoint?: string; model?: string; clear?: boolean }): Promise<LlmHubStatus> {
  const cfg = readCfg();
  if (patch.clear) delete cfg[provider];
  else cfg[provider] = { ...cfg[provider], ...(patch.key !== undefined ? { key: patch.key } : {}), ...(patch.endpoint !== undefined ? { endpoint: patch.endpoint } : {}), ...(patch.model !== undefined ? { model: patch.model } : {}) };
  writeCfg(cfg);
  auditLog("llm-config", `${provider} ${patch.clear ? "cleared" : "updated"} (key ${patch.key ? "set" : "unchanged"})`);
  return llmStatus();
}

/** REAL connection test per provider — on demand only. Honest failures. */
export async function llmTest(provider: string): Promise<LlmTestResult> {
  const cfg = readCfg();
  const guard = async (url: string, init?: RequestInit): Promise<LlmTestResult> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) return { provider, ok: true, message: `reachable (HTTP ${r.status})` };
      if (r.status === 401 || r.status === 403) return { provider, ok: false, message: `auth failed (HTTP ${r.status}) — check the key` };
      return { provider, ok: false, message: `HTTP ${r.status}` };
    } catch (e) {
      return { provider, ok: false, message: /abort/i.test(String(e)) ? "timeout (8s)" : "unreachable" };
    }
  };
  let res: LlmTestResult;
  switch (provider) {
    case "ollama": case "hermes-local": res = await guard(`${OLLAMA}/api/tags`); break;
    case "anthropic": res = cfg.anthropic?.key
      ? await guard("https://api.anthropic.com/v1/models", { headers: { "x-api-key": cfg.anthropic.key, "anthropic-version": "2023-06-01" } })
      : { provider, ok: false, message: "no key saved" }; break;
    case "openai": res = cfg.openai?.key
      ? await guard("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${cfg.openai.key}` } })
      : { provider, ok: false, message: "no key saved" }; break;
    case "gemini": res = cfg.gemini?.key
      ? await guard(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cfg.gemini.key)}`)
      : { provider, ok: false, message: "no key saved" }; break;
    case "custom": res = cfg.custom?.endpoint
      ? await guard(cfg.custom.endpoint, cfg.custom.key ? { headers: { authorization: `Bearer ${cfg.custom.key}` } } : undefined)
      : { provider, ok: false, message: "no endpoint saved" }; break;
    case "claude-cli": res = { provider, ok: binExists(["claude"]), message: binExists(["claude"]) ? "CLI present" : "CLI not found" }; break;
    default: res = { provider, ok: false, message: "no test available — SDK not integrated yet" };
  }
  auditLog("llm-test", `${provider}: ${res.ok ? "ok" : "fail"} — ${res.message}`);
  return res;
}

/**
 * LOCAL CHAT — the platform's first real end-to-end conversation path.
 * Runs against the local Ollama server (no cloud, no keys). Non-streaming v1;
 * 90s hard timeout; every failure returns the true reason.
 */
export async function llmChat(model: string, messages: LlmChatMsg[], tools?: unknown[]): Promise<LlmChatResult> {
  const tags = await ollamaTags();
  if (!tags.up) return { ok: false, text: "", model, error: "Ollama server not running on 127.0.0.1:11434" };
  const m = model && tags.models.includes(model) ? model
    : tags.models.find((x) => /hermes/i.test(x)) ?? tags.models[0];
  if (!m) return { ok: false, text: "", model, error: "no models pulled in Ollama" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);
    const body: Record<string, unknown> = { model: m, messages, stream: false };
    if (Array.isArray(tools) && tools.length) body.tools = tools; // tool-calling (hermes2-tools)
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, text: "", model: m, error: `Ollama HTTP ${r.status}` };
    const j = (await r.json()) as { message?: { content?: string; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] } };
    // normalize tool calls — Ollama returns arguments already parsed (object)
    const rawCalls = j.message?.tool_calls ?? [];
    if (rawCalls.length) {
      const toolCalls = rawCalls
        .map((c) => {
          const name = c.function?.name ?? "";
          let args = c.function?.arguments ?? {};
          if (typeof args === "string") { try { args = JSON.parse(args); } catch { args = {}; } }
          return { name, arguments: (args && typeof args === "object" ? args : {}) as Record<string, unknown> };
        })
        .filter((c) => c.name);
      if (toolCalls.length) {
        auditLog("llm-chat", `${m}: tool_calls → ${toolCalls.map((c) => c.name).join(", ")}`);
        return { ok: true, text: (j.message?.content ?? "").trim(), model: m, toolCalls, raw: j.message };
      }
    }
    const text = j.message?.content?.trim() ?? "";
    auditLog("llm-chat", `${m}: ${messages[messages.length - 1]?.content.slice(0, 60)} → ${text.slice(0, 60)}`);
    return text ? { ok: true, text, model: m } : { ok: false, text: "", model: m, error: "empty response from model" };
  } catch (e) {
    return { ok: false, text: "", model: m, error: /abort/i.test(String(e)) ? "model timeout (90s)" : String(e).slice(0, 160) };
  }
}
