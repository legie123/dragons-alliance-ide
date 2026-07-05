// Shared React Query client — importable by action registries (sectorActions)
// without going through main.tsx (avoids circular imports).
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchInterval: 2000, staleTime: 1000 } },
});
