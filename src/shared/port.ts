// Dragons Alliance IDE — renderer ↔ pty-host MessagePort protocol.
// PTY bytes never touch the main process: the renderer talks to a dedicated
// utilityProcess (pty-host) over a transferred MessagePort, with ack-based flow
// control so a flood (`yes`, `cat huge`) can't outrun the renderer.

export type TermOpts = { id: string; cmd: string; cwd: string; master?: boolean };

// renderer → pty-host
export type ToHost =
  | { t: "create"; opts: TermOpts }
  | { t: "attach"; rid: number; id: string }            // → res { buffer: ArrayBuffer }; marks pane viewed
  | { t: "detach"; id: string }                          // pane unmounted: stop streaming + counting
  | { t: "input"; id: string; data: ArrayBuffer }        // keystrokes/paste (transferable)
  | { t: "resize"; id: string; cols: number; rows: number }
  | { t: "kill"; id: string }
  | { t: "mirror"; id: string; on: boolean; scope: string }
  | { t: "list"; rid: number }                           // → res TermInfo[]
  | { t: "broadcast"; rid: number; data: string; enter: boolean; ids?: string[] } // → res {sent}
  | { t: "ack"; id: string; bytes: number };             // flow control: renderer flushed N bytes

// pty-host → renderer
export type FromHost =
  | { t: "data"; id: string; data: ArrayBuffer }         // output (transferable)
  | { t: "exit"; id: string }
  | { t: "res"; rid: number; value: unknown };           // reply to attach/list/broadcast

// flow-control thresholds (bytes of unacked output per terminal)
export const HIGH_WATER = 256 * 1024; // pause node-pty above this
export const LOW_WATER = 64 * 1024;   // resume below this

export const PORT_CHANNEL = "dai:port"; // ipc channel that carries the transferred port
