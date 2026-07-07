// Shared operational signal hook — ONE implementation of the probe → status
// pipeline, reused by the dock, top bar, status bar and settings. Reuses the
// exact query keys/intervals the dock already polls (React Query dedupes
// observers on the same key, so this adds ZERO extra polling).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTools, fetchSessions, fetchGDriveStatus } from "../api";
import { SUPERPOWERS, type OpStatus } from "../registry";

export type OpsEnv = {
  tool: (id: string) => string | undefined;
  liveAgents: number;
  google: { configured: boolean; signedIn: boolean };
  llm: { active: number; configured: number };
};

export function useOps() {
  const toolsQ = useQuery({ queryKey: ["tools"], queryFn: fetchTools, refetchInterval: 3000 });
  const sessQ = useQuery({ queryKey: ["dock-sessions"], queryFn: () => fetchSessions(240), refetchInterval: 5000 });
  const googleQ = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 6000 });
  // LLM Hub: real detection (Ollama HTTP + CLI on disk + saved keys) — 12s cadence
  const llmQ = useQuery({ queryKey: ["llm-status"], queryFn: () => window.dai.llm.status(), refetchInterval: 12000 });

  const tools = toolsQ.data;
  const liveAgents = sessQ.data?.live ?? 0;
  const gConfigured = !!googleQ.data?.configured;
  const gSignedIn = !!googleQ.data?.signedIn;
  const llmActive = llmQ.data?.active ?? 0;
  const llmConfigured = llmQ.data?.configured ?? 0;

  const env: OpsEnv = useMemo(() => ({
    tool: (id: string) => tools?.find((t) => t.id === id)?.status,
    liveAgents,
    google: { configured: gConfigured, signedIn: gSignedIn },
    llm: { active: llmActive, configured: llmConfigured },
  }), [tools, liveAgents, gConfigured, gSignedIn, llmActive, llmConfigured]);

  const statuses = useMemo(() => {
    const m: Record<string, OpStatus> = {};
    for (const sp of SUPERPOWERS) m[sp.id] = sp.statusOf(env);
    return m;
  }, [env]);

  const liveCount = useMemo(() => Object.values(statuses).filter((s) => s === "live").length, [statuses]);
  const attention = useMemo(
    () => Object.values(statuses).filter((s) => s === "error" || s === "setup-required").length,
    [statuses],
  );

  return {
    env,
    statuses,
    liveCount,
    total: SUPERPOWERS.length,
    attention,
    liveAgents,
    google: env.google,
    /** true only before the FIRST probe answers — the honest "checking" window */
    checking: toolsQ.isPending,
    lastChecked: toolsQ.dataUpdatedAt,
  };
}
