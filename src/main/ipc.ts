// Dragons Alliance IDE — IPC glue for NON-terminal services (fs / projects /
// sessions / host / window). Terminal IO lives entirely in the pty-host process
// and flows over a MessagePort — it never passes through here.
import { ipcMain, BrowserWindow, shell } from "electron";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { CH } from "../shared/ipc";
import { fsList, fsRead, fsWrite, fsWalk } from "./fs";
import { collect, getTranscript, sessionForTerm } from "./sessions";
import { agentHealth } from "./agenthealth";
import { listProjects, enrichProjects } from "./projects";
import { probeTools } from "./tools";
import { radarStatus, refreshRadar } from "./radar";

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
  ipcMain.handle(CH.FS_WRITE, (_e, { path, content }) => fsWrite(path, content));
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
      const digest = path.join(HOME, "code", "dragons-alliance-ide", "graphify-out", "_GRAPHIFY_DIGEST.md");
      execFile("open", [digest], () => shell.showItemInFolder(path.dirname(digest)));
    }
  });
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

  // ---- window controls (frameless titlebar) ----
  ipcMain.on(CH.WIN_MIN, () => mainWin?.minimize());
  ipcMain.on(CH.WIN_MAXTOGGLE, () => mainWin && (mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize()));
  ipcMain.on(CH.WIN_CLOSE, () => mainWin?.close());
}
