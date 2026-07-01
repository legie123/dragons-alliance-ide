// Dragons Alliance IDE — IPC glue for NON-terminal services (fs / projects /
// sessions / host / window). Terminal IO lives entirely in the pty-host process
// and flows over a MessagePort — it never passes through here.
import { ipcMain, BrowserWindow } from "electron";
import os from "node:os";
import { CH } from "../shared/ipc";
import { fsList, fsRead, fsWrite, fsWalk } from "./fs";
import { collect } from "./sessions";
import { listProjects, enrichProjects } from "./projects";

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
  ipcMain.handle(CH.HOST_INFO, () => ({
    shell: process.env.SHELL || "/bin/zsh",
    home: os.homedir(),
    cwd: os.homedir(),
    projects: listProjects(),
  }));

  // ---- window controls (frameless titlebar) ----
  ipcMain.on(CH.WIN_MIN, () => mainWin?.minimize());
  ipcMain.on(CH.WIN_MAXTOGGLE, () => mainWin && (mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize()));
  ipcMain.on(CH.WIN_CLOSE, () => mainWin?.close());
}
