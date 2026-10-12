import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { RouterProvider } from "react-router";
import { useEngineEvents } from "@/api/engineSocket";
import { queryKeys } from "@/api/queries";
import type { EngineEvent } from "@/api/types";
import { ToastProvider } from "@/components/ui";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false } },
});

/** Engine events keep cached REST data fresh without polling. */
function EngineEventSync() {
  const client = useQueryClient();
  const onEvent = useCallback(
    (event: EngineEvent) => {
      if (event.kind === "activation_changed" || event.kind === "command") {
        void client.invalidateQueries({ queryKey: queryKeys.engine });
      }
      if (event.kind === "settings_changed") client.setQueryData(queryKeys.settings, event.settings);
    },
    [client],
  );
  useEngineEvents(onEvent);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EngineEventSync />
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
