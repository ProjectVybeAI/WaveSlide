// The tally block: Live or Paused, on every settings-window page, with the one button that flips it.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import { useEngineFrame } from "@/api/engineSocket";
import { queryKeys, useEngineSnapshot } from "@/api/queries";
import styles from "./TallyBlock.module.css";

export function TallyBlock() {
  const frame = useEngineFrame();
  const snapshot = useEngineSnapshot();
  const queryClient = useQueryClient();
  const live = frame?.active ?? snapshot.data?.active ?? false;
  const profile = snapshot.data?.profile_id === "google_slides" ? "Google Slides" : "your slides";

  const toggle = useMutation({
    mutationFn: (active: boolean) => unwrap(api.POST("/api/engine/active", { body: { active } })),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.engine, data),
  });

  return (
    <section className={styles.tally} data-live={live} aria-label="Gesture control">
      <span className={styles.lamp} aria-hidden="true" />
      <p className={styles.word} aria-live="polite">
        {live ? "Live" : "Paused"}
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={() => toggle.mutate(!live)}
        disabled={toggle.isPending}
      >
        {live ? "Pause" : "Go live"}
      </button>
      <p className={styles.hint}>
        {live
          ? `Gestures send keys to ${profile}. Thumbs up for 1 s pauses.`
          : "Gestures are ignored. Thumbs up for 1 s goes live."}
      </p>
    </section>
  );
}
