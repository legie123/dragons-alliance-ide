// useKit — HONEST detection of the onboarding "kit". Runs the real IPC (no fakes):
//  - command items → window.dai.system.checkCommand (login-shell PATH, so an
//    installed CLI reads ready, not falsely "missing")
//  - the obsidian item → window.dai.tools.status() (vault present?)
//  - the google item → window.dai.gdrive.status() (configured/signed-in?)
// Anything we can't verify counts as "missing" (fail-closed = honest: we only
// claim "ready" when we can prove it). `results` are the REQUIRED items (what
// KitSetup lists first + what the progress/complete math is over); optional
// items (Google) are returned separately so they never block "kit complete".
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KIT_ITEMS, type KitItem } from "../data/kitItems";

export type KitStatus = "ready" | "partial" | "missing";
export type KitResult = { item: KitItem; status: KitStatus };

async function detectAll(): Promise<KitResult[]> {
  // one probe each for the shared sources, then per-command checks in parallel
  const [tools, gdrive] = await Promise.all([
    window.dai.tools.status().catch(() => [] as Array<{ id: string; status: string }>),
    window.dai.gdrive.status().catch(() => ({ configured: false, signedIn: false })),
  ]);
  return Promise.all(
    KIT_ITEMS.map(async (item): Promise<KitResult> => {
      let status: KitStatus = "missing";
      try {
        if (item.detect.kind === "command") {
          status = (await window.dai.system.checkCommand(item.detect.command)) ? "ready" : "missing";
        } else if (item.detect.kind === "tool") {
          const toolId = item.detect.toolId; // capture in the narrowed outer scope
          const found = tools.find((x) => x.id === toolId);
          status = !found || found.status === "off" ? "missing" : "ready";
        } else {
          status = gdrive.signedIn ? "ready" : gdrive.configured ? "partial" : "missing";
        }
      } catch {
        status = "missing";
      }
      return { item, status };
    }),
  );
}

export function useKit(): {
  results: KitResult[];        // REQUIRED items only
  ready: number;               // count of required items that are ready
  total: number;               // count of required items
  optionalResults: KitResult[];
  complete: boolean;           // all required items ready
  checking: boolean;
  recheck: () => void;
} {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ["kit-detect"],
    queryFn: detectAll,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const all = data ?? [];
  const results = all.filter((r) => !r.item.optional);
  const optionalResults = all.filter((r) => r.item.optional);
  const ready = results.filter((r) => r.status === "ready").length;
  const total = results.length || KIT_ITEMS.filter((i) => !i.optional).length;
  return {
    results,
    ready,
    total,
    optionalResults,
    complete: results.length > 0 && results.every((r) => r.status === "ready"),
    checking: isFetching,
    recheck: () => qc.invalidateQueries({ queryKey: ["kit-detect"] }),
  };
}
