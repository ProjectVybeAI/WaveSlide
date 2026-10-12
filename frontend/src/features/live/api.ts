// Engine controls and the lists the Live, Overlay and Settings screens read. Typed from the contract.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import { queryKeys } from "@/api/queries";

export const liveKeys = {
  profiles: ["profiles"] as const,
  cameras: ["cameras"] as const,
  sessions: ["sessions"] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: liveKeys.profiles,
    queryFn: () => unwrap(api.GET("/api/profiles")),
    staleTime: 60_000,
  });
}

export function useCameras() {
  return useQuery({
    queryKey: liveKeys.cameras,
    queryFn: () => unwrap(api.GET("/api/cameras")),
    staleTime: 60_000,
  });
}

export function useSessions() {
  return useQuery({ queryKey: liveKeys.sessions, queryFn: () => unwrap(api.GET("/api/sessions")) });
}

/** Go live or pause. The engine answers with its new snapshot. */
export function useSetActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) => unwrap(api.POST("/api/engine/active", { body: { active } })),
    onSuccess: (snapshot) => client.setQueryData(queryKeys.engine, snapshot),
  });
}

/** Full, compact or hidden. The desktop shell resizes the window; in a browser it does nothing. */
export function useSetOverlay() {
  return useMutation({
    mutationFn: (mode: "full" | "compact" | "hidden") => unwrap(api.POST("/api/overlay", { body: { mode } })),
  });
}

/** Switch between the camera and a recorded session. */
export function useSetSource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (source: { kind: "camera" | "replay"; sessionId?: string }) =>
      unwrap(
        api.POST("/api/engine/source", {
          body: { kind: source.kind, session_id: source.sessionId ?? null, loop: true },
        }),
      ),
    onSuccess: (snapshot) => client.setQueryData(queryKeys.engine, snapshot),
  });
}
