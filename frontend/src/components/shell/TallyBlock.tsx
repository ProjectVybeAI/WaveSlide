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
  // The same "No camera" state as the overlay band: gestures cannot act whatever the switch says.
  const cameraLost = snapshot.data?.camera_ok === false;
  const state = cameraLost ? "camera" : live ? "live" : "paused";
  const profile = snapshot.data?.profile_id === "google_slides" ? "Google Slides" : "your slides";

  const toggle = useMutation({
    mutationFn: (active: boolean) => unwrap(api.POST("/api/engine/active", { body: { active } })),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.engine, data),
  });

  return (
    <section className={styles.tally} data-state={state} aria-label="Gesture control">
      <span className={styles.lamp} aria-hidden="true" />
      <p className={styles.word} aria-live="polite">
        {cameraLost ? "No camera" : live ? "Live" : "Paused"}
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
        {cameraLost
          ? "Gestures are off until the camera is back."
          : live
            ? `Gestures send keys to ${profile}. Thumbs up for 1 s pauses.`
            : "Gestures are ignored. Thumbs up for 1 s goes live."}
      </p>
    </section>
  );
}
