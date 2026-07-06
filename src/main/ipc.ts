// Dragons Alliance IDE — IPC glue for NON-terminal services (fs / projects /
// sessions / host / window). Terminal IO lives entirely in the pty-host process
// and flows over a MessagePort — it never passes through here.
import { ipcMain, BrowserWindow, shell } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { CH } from "../shared/ipc";
import { fsList, fsRead, fsWrite, fsWalk } from "./fs";
import { collect, getTranscript, sessionForTerm } from "./sessions";
import { agentHealth } from "./agenthealth";
import { listProjects, enrichProjects } from "./projects";
import { probeTools } from "./tools";
import { radarStatus, refreshRadar } from "./radar";
import { buildGraph, nodeDetail, armWatch } from "./neuromap";
import { gdriveStatus, gdriveAuth, gdriveSignout, gdriveSetClient, gdriveList, gdriveSearch, gdriveRead, gdriveBackup } from "./gdrive";
import { gEnsureTree, gCreateFolder, gUpload, gSheetCreate, gSheetRead, gSheetUpdate, gFormCreate, gFormResponses, gMailSearch, gMailGet, gMailAttachmentToDrive } from "./google";
import { metaList, metaUpsert, candidateCreate } from "./driveMeta";
import { protonStatus, protonSetConfig } from "./proton";
import { settingsGet, settingsSet } from "./settings";
import { auditLog, auditList } from "./audit";
import { permsGet, permsSet } from "./permissions";
import { tipsList, tipsUpsert, tipsDelete } from "./tips";
import { teamGet, teamSet, me as teamMe, identitySet, teamCan } from "./team";
import { vaultStatus, vaultSync, vaultSetRemote } from "./vaultSync";
import { gHealth } from "./google";
import * as fsN from "node:fs";
import { neoStatus, neoEnsure, neoTabs, neoOpen, neoNavigate, neoReload, neoBack, neoForward, neoAsk, neoClick, neoScroll, neoSnap } from "./neo";
import { superpowerHealth, openGraphDigest } from "./superpowers";
import type { NeuroGraphOpts, NeuroLayer } from "../shared/ipc";

const execFileP = promisify(execFile);

type LiveTerm = { id: string; cwd: string; is_master: boolean };

let mainWin: BrowserWindow | null = null;
let registered = false;

export function registerIpc(win: BrowserWindow, getTerms: () => LiveTerm[]): void {
  mainWin = win;
  if (registered) return; // idempotent across window recreation (macOS activate)
  registered = true;

  // ---- fs ----
  ipcMain.handle(CH.FS_LIST, (_e, path) => fsList(path));
  ipcMain.handle(CH.FS_READ, (_e, path) => fsRead(path));
  ipcMain.handle(CH.FS_WRITE, (_e, { path, content }) => {
    auditLog("fs-write", String(path));
    return fsWrite(path, content);
  });
  ipcMain.handle(CH.FS_WALK, (_e, { root, limit }) => fsWalk(root, limit));

  // ---- data ----
  ipcMain.handle(CH.PROJECTS_LIST, async () => enrichProjects(getTerms()));
  ipcMain.handle(CH.SESSIONS_LIST, async (_e, activeMin: number) => {
    const sessions = await collect(activeMin ?? 240);
    return {
      now: Date.now() / 1000,
      active_min: activeMin ?? 240,
      live: sessions.filter((s) => s.idle_min < 3).length,
      sessions,
    };
  });
  ipcMain.handle(CH.SESSIONS_TRANSCRIPT, (_e, { file, limit }) => getTranscript(file, limit));
  ipcMain.handle(CH.AGENT_HEALTH, (_e, file: string) => agentHealth(file));
  ipcMain.handle(CH.TERM_SESSION, (_e, cwd: string) => sessionForTerm(cwd));
  ipcMain.handle(CH.TOOLS_STATUS, () => probeTools());
  ipcMain.handle(CH.RADAR_STATUS, () => radarStatus());
  ipcMain.on(CH.RADAR_REFRESH, () => refreshRadar());
  ipcMain.on(CH.TOOLS_ACTION, (_e, id: string) => {
    const HOME = os.homedir();
    if (id === "open-obsidian") {
      shell.openExternal("obsidian://open?vault=Antigravity-Brain");
    } else if (id === "open-graphify") {
      const dir = path.join(HOME, "code", "dragons-alliance-ide", "graphify-out");
      const digest = path.join(dir, "_GRAPHIFY_DIGEST.md");
      if (fsN.existsSync(digest)) {
        execFile("open", [digest]);
        auditLog("graphify-digest-open", digest);
      } else if (fsN.existsSync(dir)) {
        shell.showItemInFolder(dir);
        auditLog("graphify-digest-missing", `digest not found, opened output dir instead: ${dir}`);
      } else {
        auditLog("graphify-digest-missing", "no graphify-out dir yet — run the graphify pipeline first");
      }
    }
  });
  // ---- superpowers: real engine health probes + digest open ----
  ipcMain.handle(CH.SP_HEALTH, (_e, id: string) => superpowerHealth(String(id)));
  ipcMain.handle(CH.SP_OPEN_DIGEST, () => openGraphDigest());
  ipcMain.handle(CH.HOST_INFO, () => ({
    shell: process.env.SHELL || "/bin/zsh",
    home: os.homedir(),
    cwd: os.homedir(),
    projects: listProjects(),
  }));

  // ---- shell: open external URL (http/https only — never file:// or app schemes) ----
  ipcMain.on(CH.SHELL_OPEN, (_e, url: string) => {
    try {
      const u = new URL(String(url));
      if (u.protocol === "http:" || u.protocol === "https:") shell.openExternal(u.href);
    } catch { /* malformed url — ignore */ }
  });

  // ---- neuromap (Obsidian vault knowledge graph, live) ----
  ipcMain.handle(CH.NEUROMAP_GRAPH, (_e, opts: NeuroGraphOpts) => buildGraph(opts));
  ipcMain.handle(CH.NEUROMAP_NODE, (_e, id: string) => nodeDetail(id));
  ipcMain.on(CH.NEUROMAP_WATCH, (_e, layers: NeuroLayer[]) => {
    armWatch(layers, (changed) => {
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(CH.NEUROMAP_CHANGED, changed);
    });
  });

  // ---- google drive (OAuth + REST all in main; renderer never sees tokens) ----
  ipcMain.handle(CH.GDRIVE_STATUS, () => gdriveStatus());
  ipcMain.handle(CH.GDRIVE_AUTH, () => { auditLog("google-auth", "OAuth sign-in started"); return gdriveAuth(); });
  ipcMain.handle(CH.GDRIVE_SIGNOUT, () => gdriveSignout());
  ipcMain.handle(CH.GDRIVE_SET_CLIENT, (_e, { clientId, clientSecret }) => gdriveSetClient(clientId, clientSecret));
  ipcMain.handle(CH.GDRIVE_LIST, (_e, folderId?: string) => gdriveList(folderId));
  ipcMain.handle(CH.GDRIVE_SEARCH, (_e, query: string) => gdriveSearch(query));
  ipcMain.handle(CH.GDRIVE_READ, (_e, fileId: string) => gdriveRead(fileId));
  ipcMain.handle(CH.GDRIVE_BACKUP, () => { auditLog("drive-backup", "vault → Drive backup started"); return gdriveBackup(); });

  // ---- google workspace (folders / sheets / forms / gmail) ----
  ipcMain.handle(CH.GOOGLE_ENSURE_TREE, () => gEnsureTree());
  ipcMain.handle(CH.GOOGLE_FOLDER_CREATE, (_e, { name, parentId }) => gCreateFolder(name, parentId));
  ipcMain.handle(CH.GOOGLE_UPLOAD, (_e, { localPath, folderId, convert }) => gUpload(localPath, folderId, convert));
  ipcMain.handle(CH.SHEET_CREATE, (_e, { title, folderId }) => gSheetCreate(title, folderId));
  ipcMain.handle(CH.SHEET_READ, (_e, { id, range }) => gSheetRead(id, range));
  ipcMain.handle(CH.SHEET_UPDATE, (_e, { id, range, values }) => gSheetUpdate(id, range, values));
  ipcMain.handle(CH.FORM_CREATE, (_e, title: string) => gFormCreate(title));
  ipcMain.handle(CH.FORM_RESPONSES, (_e, formId: string) => gFormResponses(formId));
  ipcMain.handle(CH.MAIL_SEARCH, (_e, q: string) => gMailSearch(q));
  ipcMain.handle(CH.MAIL_GET, (_e, id: string) => gMailGet(id));
  ipcMain.handle(CH.MAIL_SAVE_ATTACHMENT, (_e, { msgId, attId, filename, folderId }) => gMailAttachmentToDrive(msgId, attId, filename, folderId));

  // ---- drive metadata registry + candidates ----
  ipcMain.handle(CH.META_LIST, (_e, filter) => metaList(filter));
  ipcMain.handle(CH.META_UPSERT, (_e, entry) => metaUpsert(entry));
  ipcMain.handle(CH.CANDIDATE_CREATE, (_e, name: string) => candidateCreate(name));

  // ---- proton mail (bridge probe) ----
  ipcMain.handle(CH.PROTON_STATUS, () => protonStatus());
  ipcMain.handle(CH.PROTON_SET_CONFIG, (_e, { host, port, user }) => protonSetConfig(host, port, user));

  // ---- settings (local IDE configuration) ----
  ipcMain.handle(CH.SETTINGS_GET, () => settingsGet());
  ipcMain.handle(CH.SETTINGS_SET, (_e, patch) => {
    const next = settingsSet(patch);
    auditLog("settings", "settings updated: " + Object.keys(patch ?? {}).join(", "));
    return next;
  });

  // ---- audit trail ----
  ipcMain.handle(CH.AUDIT_LIST, (_e, limit?: number) => auditList(limit));
  ipcMain.on(CH.AUDIT_LOG, (_e, { kind, detail }: { kind: string; detail: string }) => auditLog(kind, detail));

  // ---- permissions (local team/role model) ----
  ipcMain.handle(CH.PERMS_GET, () => permsGet());
  ipcMain.handle(CH.PERMS_SET, (_e, state) => {
    const next = permsSet(state);
    auditLog("permissions", `permissions saved: ${next.members.length} member(s)`);
    return next;
  });
  // ---- library tips (local smart-tricks notes, admin-editable) ----
  ipcMain.handle(CH.TIPS_LIST, () => tipsList());
  ipcMain.handle(CH.TIPS_UPSERT, (_e, entry) => {
    if (!teamCan("adm:library")) return { error: "not permitted" };
    const saved = tipsUpsert(entry);
    auditLog("tips", `tip saved: ${saved.title}`);
    return saved;
  });
  ipcMain.handle(CH.TIPS_DELETE, (_e, id) => {
    if (!teamCan("adm:library")) return false;
    const ok = tipsDelete(id);
    if (ok) auditLog("tips", `tip deleted: ${id}`);
    return ok;
  });

  // ---- team access control (roster + per-member grants, synced via vault) ----
  ipcMain.handle(CH.TEAM_GET, () => teamGet());
  ipcMain.handle(CH.TEAM_SET, (_e, cfg) => teamSet(cfg));
  ipcMain.handle(CH.TEAM_ME, () => teamMe());
  ipcMain.handle(CH.IDENTITY_SET, (_e, memberId: string) => identitySet(String(memberId)));

  // ---- vault sync (git engine over the Obsidian vault) ----
  ipcMain.handle(CH.VAULT_STATUS, () => vaultStatus());
  ipcMain.handle(CH.VAULT_SYNC, async (_e, message?: string) => {
    const res = await vaultSync(message);
    auditLog("vault-sync", res.ok ? res.detail : "FAILED: " + (res.error ?? "unknown"));
    return res;
  });
  ipcMain.handle(CH.VAULT_SET_REMOTE, async (_e, url: string) => {
    const st = await vaultSetRemote(url);
    auditLog("vault-remote", st.remote ? "origin → " + st.remote : "remote rejected/unchanged");
    return st;
  });

  // ---- google per-service health ----
  ipcMain.handle(CH.GOOGLE_HEALTH, () => gHealth());

  // ---- command existence check (for renderer status probes) ----
  ipcMain.handle(CH.SYSTEM_CHECK_COMMAND, async (_e, command: string) => {
    try {
      const { stdout } = await execFileP("which", [command]);
      return stdout.trim() !== "";
    } catch {
      return false;
    }
  });

  // ---- screenshot (window capture → ~/Desktop) ----
  ipcMain.handle(CH.SHOT_CAPTURE, async () => {
    if (!mainWin || mainWin.isDestroyed()) return { ok: false, error: "no window" };
    try {
      const img = await mainWin.webContents.capturePage();
      const file = path.join(os.homedir(), "Desktop", `dai-shot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`);
      fsN.writeFileSync(file, img.toPNG());
      auditLog("screenshot", file);
      return { ok: true, path: file };
    } catch (e: any) {
      return { ok: false, error: String(e?.message ?? e).slice(0, 200) };
    }
  });

  // ---- neo browser (Preview view — real Neo over CDP) ----
  ipcMain.handle(CH.NEO_STATUS, () => neoStatus());
  ipcMain.handle(CH.NEO_ENSURE, () => neoEnsure());
  ipcMain.handle(CH.NEO_TABS, () => neoTabs());
  ipcMain.handle(CH.NEO_OPEN, (_e, url: string) => neoOpen(url));
  ipcMain.handle(CH.NEO_NAVIGATE, (_e, { url, tab }: { url: string; tab?: string }) => neoNavigate(url, tab));
  ipcMain.handle(CH.NEO_RELOAD, (_e, tab?: string) => neoReload(tab));
  ipcMain.handle(CH.NEO_BACK, (_e, tab?: string) => neoBack(tab));
  ipcMain.handle(CH.NEO_FORWARD, (_e, tab?: string) => neoForward(tab));
  ipcMain.handle(CH.NEO_ASK, (_e, { prompt, submit }: { prompt: string; submit?: boolean }) => neoAsk(prompt, submit));
  ipcMain.handle(CH.NEO_CLICK, (_e, { x, y, tab }: { x: number; y: number; tab?: string }) => neoClick(x, y, tab));
  ipcMain.handle(CH.NEO_SCROLL, (_e, { dy, tab }: { dy: number; tab?: string }) => neoScroll(dy, tab));
  ipcMain.handle(CH.NEO_SNAP, (_e, tab?: string) => neoSnap(tab));

  // ---- window controls (frameless titlebar) ----
  ipcMain.on(CH.WIN_MIN, () => mainWin?.minimize());
  ipcMain.on(CH.WIN_MAXTOGGLE, () => mainWin && (mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize()));
  ipcMain.on(CH.WIN_CLOSE, () => mainWin?.close());
}
