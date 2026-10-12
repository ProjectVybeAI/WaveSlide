// Camera or a recorded session: a segmented control (a hardware-style switch) and, for replay, which session.
import { History, Video } from "lucide-react";
import { useState } from "react";
import { Select } from "@/components/ui";
import { Segmented } from "@/features/settings/Segmented";
import type { EngineSnapshot } from "@/api/types";
import { useSessions, useSetSource } from "./api";
import styles from "./SourceSwitch.module.css";

const DEFAULT_SESSION = "synthetic-demo";

export function SourceSwitch({ snapshot }: { snapshot: EngineSnapshot | undefined }) {
  const sessions = useSessions();
  const setSource = useSetSource();
  const ids = sessions.data?.map((session) => session.id) ?? [];
  const [chosen, setChosen] = useState<string | null>(null);
  const session =
    chosen ?? snapshot?.session_id ?? (ids.includes(DEFAULT_SESSION) ? DEFAULT_SESSION : ids[0]);
  const source = snapshot?.source ?? "camera";

  return (
    <div className={styles.switch}>
      <Segmented
        label="Landmark source"
        value={source}
        onValueChange={(value) => {
          if (value === "camera") setSource.mutate({ kind: "camera" });
          else if (session) setSource.mutate({ kind: "replay", sessionId: session });
        }}
        options={[
          { value: "camera", label: "Camera", icon: Video, disabled: setSource.isPending },
          {
            value: "replay",
            label: "Replay a session",
            icon: History,
            disabled: setSource.isPending || ids.length === 0,
          },
        ]}
      />
      {source === "replay" && ids.length > 0 ? (
        <Select
          aria-label="Session to replay"
          value={session}
          options={ids.map((id) => ({ value: id, label: id }))}
          onValueChange={(id) => {
            setChosen(id);
            setSource.mutate({ kind: "replay", sessionId: id });
          }}
          className={styles.sessions}
        />
      ) : null}
      {setSource.error ? <SwitchError error={setSource.error} /> : null}
    </div>
  );
}

function SwitchError({ error }: { error: Error }) {
  return (
    <p className={styles.error} role="alert">
      {error.message}
    </p>
  );
}
