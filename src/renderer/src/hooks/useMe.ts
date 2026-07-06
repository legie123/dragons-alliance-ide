// Current identity + capability gate for the renderer. React Query keeps it in
// one cache ("me") so every enforcement point reads the same resolved grants.
import { useQuery } from "@tanstack/react-query";
import type { Me } from "@shared/ipc";
import { grantsHave } from "@shared/teamCaps";

export function useMe() {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => window.dai.team.me(), refetchInterval: 10000 });
  return {
    me: me as Me | undefined,
    isOwner: !!me?.isOwner,
    // default-allow while loading so the UI doesn't flicker into "restricted";
    // enforcement is cooperative, not a security gate.
    can: (cap: string) => (me ? grantsHave(me.grants, cap) : true),
  };
}
