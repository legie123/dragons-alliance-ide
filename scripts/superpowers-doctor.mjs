#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HOME = os.homedir();

// Resolve the repo we're actually checking: prefer the checkout this script
// lives in (works from any cwd, and correctly follows git worktrees used for
// isolated dev) — fall back to the canonical ~/code checkout if this copy
// isn't a real dragons-alliance-ide tree (e.g. script copied elsewhere).
function resolveRepo() {
  const scriptRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(scriptRepo, "package.json"), "utf8"));
    if (pkg.name === "dragons-alliance-ide") return scriptRepo;
  } catch {}
  return path.join(HOME, "code", "dragons-alliance-ide");
}
const repo = resolveRepo();
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const verbose = args.has("--verbose");
const fixSafe = args.has("--fix-safe");

const checks = [];
const add = (scope, status, detail, fix = "", blockedBy = "") => {
  checks.push({ scope, status, detail, fix, blockedBy });
};
const read = (p) => {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
};
const exists = (p) => {
  try { return fs.existsSync(p); } catch { return false; }
};
const statMode = (p) => {
  try { return (fs.statSync(p).mode & 0o777).toString(8); } catch { return ""; }
};
const command = (name) => {
  try {
    execFileSync("command", ["-v", name], { shell: true, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

if (!exists(repo)) {
  add("repo", "error", `Repo missing at ${repo}`, "Clone or restore dragons-alliance-ide", "local checkout");
  finish();
}

const registry = read(path.join(repo, "src/renderer/src/registry.tsx"));
const shared = read(path.join(repo, "src/shared/ipc.ts"));
const preload = read(path.join(repo, "src/preload/index.ts"));
const mainIpc = read(path.join(repo, "src/main/ipc.ts"));
const tools = read(path.join(repo, "src/main/tools.ts"));

const superpowers = ["obsidian", "graphify", "ruflo", "cloud", "agents", "godmode", "google"];
for (const id of superpowers) {
  const present = registry.includes(`id: "${id}"`);
  const hasActionBlock = present && registry.includes(`id: "${id}"`) && registry.includes("actions:");
  add(id, present && hasActionBlock ? "ok" : "error", present ? "Declared in registry" : "Missing from registry", present ? "" : "Add to SUPERPOWERS", present ? "" : "code");
}

const disabledCount = (registry.match(/disabledReason:/g) || []).length;
add("registry", disabledCount ? "warn" : "ok", `${disabledCount} disabled quick action(s) remain`, "Prefer actionable setup/control fallback routes", disabledCount ? "missing backend or intentional guard" : "");

for (const ch of ["TOOLS_STATUS", "TOOLS_ACTION", "GDRIVE_STATUS", "GDRIVE_AUTH", "GOOGLE_HEALTH", "AUDIT_LOG"]) {
  const ok = shared.includes(ch) && preload.includes("window.dai") && mainIpc.includes(`CH.${ch}`);
  add(`ipc:${ch}`, ok ? "ok" : "error", ok ? "Shared/preload/main path present" : "IPC path incomplete", "Trace shared -> preload -> main handler", ok ? "" : "code");
}

const vaultPath = path.join(HOME, "Documents", "Obsidian", "Antigravity-Brain");
add("obsidian:vault", exists(vaultPath) ? "ok" : "setup-required", exists(vaultPath) ? "Vault path exists" : "Vault path missing", "Create or point settings at the real vault", exists(vaultPath) ? "" : "local vault");
add("obsidian:app", command("open") ? "ok" : "error", "macOS open command availability", "macOS shell.openExternal handles obsidian://", "");

const graphDigest = path.join(repo, "graphify-out", "_GRAPHIFY_DIGEST.md");
add("grapevine:digest", exists(graphDigest) ? "ok" : "setup-required", exists(graphDigest) ? "Graphify digest exists" : "Graphify digest missing", "Run graphify pipeline or use Neuromap fallback", exists(graphDigest) ? "" : "graphify output");

const ruvectors = [
  path.join(repo, "ruvector.db"),
  path.join(HOME, "code", "claude-dashboard", "ruvector.db"),
];
add("ruflo:memory", ruvectors.some(exists) ? "ok" : "setup-required", ruvectors.some(exists) ? "Ruflo vector DB found" : "No Ruflo vector DB found", "Start Ruflo or configure vector memory path", ruvectors.some(exists) ? "" : "ruflo setup");
add("ruflo:cli", command("ruflo") ? "ok" : "setup-required", command("ruflo") ? "ruflo command available" : "ruflo command not found", "Install or expose ruflo on PATH", command("ruflo") ? "" : "local CLI");

add("cloud:claude", command("claude") ? "ok" : "setup-required", command("claude") ? "claude command available" : "claude command not found", "Install/login to Claude Code", command("claude") ? "" : "Claude Code auth");
add("agents:sessions", tools.includes("collect(240)") ? "ok" : "warn", "Session collection probe checked in tools layer", "Keep collect active for Mission Control", "");

const godLab = path.join(HOME, "code", "godmode-lab");
add("godmode:panel", registry.includes("dai:godmode") ? "ok" : "error", "GODMODE panel event route", "Wire dai:godmode to panel", "");
add("godmode:lab", exists(godLab) ? "ok" : "setup-required", exists(godLab) ? "External godmode-lab exists" : "External godmode-lab missing", "Create lab or keep status split from panel", exists(godLab) ? "" : "external lab");

const googleCfg = path.join(HOME, ".config", "dai", "google.json");
if (!exists(googleCfg)) {
  if (fixSafe) fs.mkdirSync(path.dirname(googleCfg), { recursive: true, mode: 0o700 });
  add("google:config", "setup-required", "Google config missing", "Open Credentials and paste Desktop OAuth client id/secret", "Google Cloud OAuth");
} else {
  const raw = read(googleCfg);
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch {}
  const configured = !!(parsed.clientId && parsed.clientSecret);
  const signedIn = !!parsed.refreshToken;
  const mode = statMode(googleCfg);
  add("google:config", configured ? "ok" : "setup-required", configured ? "OAuth client present (values hidden)" : "OAuth client missing", "Paste client id/secret in Credentials", configured ? "" : "Google Cloud OAuth");
  add("google:signin", signedIn ? "ok" : "setup-required", signedIn ? "Refresh token present (hidden)" : "Refresh token missing", "Click Sign in with Google after saving credentials", signedIn ? "" : "Google user consent");
  add("google:permissions", mode === "600" ? "ok" : "warn", `google.json mode ${mode || "unknown"}`, "chmod 600 ~/.config/dai/google.json", mode === "600" ? "" : "file permissions");
}

finish();

function finish() {
  const statusRank = { error: 3, warn: 2, "setup-required": 1, ok: 0 };
  const summary = checks.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  if (asJson) {
    console.log(JSON.stringify({ repo, summary, checks }, null, 2));
  } else {
    console.log("Dragons Alliance IDE SUPERPOWERS Doctor");
    console.log(`Repo: ${repo}`);
    console.log(`Summary: ${Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(" ")}`);
    console.log("");
    for (const c of checks.sort((a, b) => (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0))) {
      console.log(`${c.status.padEnd(14)} ${c.scope.padEnd(22)} ${c.detail}`);
      if (verbose && c.fix) console.log(`  fix: ${c.fix}${c.blockedBy ? ` (blocked by ${c.blockedBy})` : ""}`);
    }
  }
  process.exit(checks.some((c) => c.status === "error") ? 1 : 0);
}
