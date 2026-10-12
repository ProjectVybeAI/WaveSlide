// Settings queries and mutations. The settings query key is shared, so the WebSocket's
// `settings_changed` event (see App.tsx) keeps every screen current.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/api/queries";
import type { Settings } from "@/api/types";

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => unwrap(api.GET("/api/settings")) });
}

/** The trained model's card, or null while none exists (the engine answers 404 NO_MODEL). */
export function useModelCard() {
  return useQuery({
    queryKey: ["model"] as const,
    queryFn: async () => {
      try {
        return await unwrap(api.GET("/api/model"));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });
}

function useSettingsMutation<Input>(request: (input: Input) => Promise<Settings>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.settings, saved);
      void client.invalidateQueries({ queryKey: queryKeys.engine });
    },
  });
}

export const useSaveSettings = () =>
  useSettingsMutation((settings: Settings) => unwrap(api.PUT("/api/settings", { body: settings })));

export const useResetSettings = () => useSettingsMutation(() => unwrap(api.POST("/api/settings/reset")));

export const useImportSettings = () =>
  useSettingsMutation((file: File) =>
    unwrap(
      api.POST("/api/settings/import", {
        // The generated type says `string`; a multipart upload carries the File itself.
        body: { file: "" },
        bodySerializer: () => {
          const form = new FormData();
          form.append("file", file);
          return form;
        },
      }),
    ),
  );

/** Downloads the saved settings as waveslide-settings.json. */
export async function downloadSettings() {
  const { data } = await api.GET("/api/settings/export", { parseAs: "blob" });
  if (!data) return;
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "waveslide-settings.json";
  link.click();
  URL.revokeObjectURL(url);
}
