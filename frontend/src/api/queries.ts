// Shared queries used by the shell (every feature reads these).
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "./client";

export const queryKeys = {
  health: ["health"] as const,
  engine: ["engine"] as const,
  settings: ["settings"] as const,
};

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: () => unwrap(api.GET("/api/health")) });
}

export function useEngineSnapshot() {
  return useQuery({
    queryKey: queryKeys.engine,
    queryFn: () => unwrap(api.GET("/api/engine")),
    refetchInterval: 2000,
  });
}
