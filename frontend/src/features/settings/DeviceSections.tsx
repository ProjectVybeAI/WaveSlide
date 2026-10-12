// Camera and app (which camera, which app profile and the keys it receives) and Recogniser (rules or
// the trained model, which needs a model to exist).
import { CircleCheck } from "lucide-react";
import { Link } from "react-router";
import type { AppProfile, CameraInfo, Health, ModelCard } from "@/api/types";
import { toMessage } from "@/api/errors";
import { KeyCaps } from "@/components/hand/KeyCaps";
import {
  Callout,
  Field,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  buttonClassName,
} from "@/components/ui";
import { ACTION_LABEL } from "@/components/hand/cue";
import type { UseQueryResult } from "@tanstack/react-query";
import { useDraft } from "./draft";
import { PROFILE_IDS, PROFILE_NAME } from "./settingsSchema";
import { Segmented } from "./Segmented";
import { SetSection } from "./SetSection";
import styles from "./DeviceSections.module.css";

const PLATFORM_NAME = { darwin: "macOS", win32: "Windows", other: "this computer" } as const;
const KEY_ROWS = ["next", "previous", "blank_toggle", "jump", "start_show", "exit_show"] as const;

type CameraProps = {
  cameras: UseQueryResult<CameraInfo[]>;
  profiles: UseQueryResult<AppProfile[]>;
  health: Health | undefined;
};

export function CameraAppSection({ cameras, profiles, health }: CameraProps) {
  const { values, changed, set } = useDraft();
  const list = cameras.data ?? [];
  const index = values.camera.index;
  const known = list.some((camera) => camera.index === index);
  const cameraOptions = [
    ...list.map((camera) => ({ value: String(camera.index), label: camera.name })),
    ...(known || cameras.isPending ? [] : [{ value: String(index), label: `Camera ${index} (not found)` }]),
  ];
  const profile = profiles.data?.find((item) => item.id === values.profile_id);
  const platform = PLATFORM_NAME[health?.platform ?? "other"];

  return (
    <SetSection
      title="Camera and app"
      description="WaveSlide presses keys in whichever app is in front. The profile decides which keys."
      columns={2}
    >
      <Field
        label={<>Camera {changed.has("camera.index") ? <span className={styles.tag}>Changed</span> : null}</>}
        help={
          cameras.isError
            ? `Cameras could not be listed. ${toMessage(cameras.error)}`
            : list.length === 0 && !cameras.isPending
              ? "No camera found. Plug one in, then reopen this page."
              : `${values.camera.width} × ${values.camera.height}. Switching restarts the camera for about a second.`
        }
      >
        <Select
          value={String(index)}
          onValueChange={(next) => set("camera.index", Number(next))}
          options={cameraOptions}
          placeholder={cameras.isPending ? "Looking for cameras" : "No camera found"}
          disabled={cameras.isPending || cameraOptions.length === 0}
        />
      </Field>
      <Field
        label={
          <>App profile {changed.has("profile_id") ? <span className={styles.tag}>Changed</span> : null}</>
        }
        help={profile?.description ?? "Which keys WaveSlide sends."}
      >
        <Select
          value={values.profile_id}
          onValueChange={(next) => set("profile_id", next as (typeof PROFILE_IDS)[number])}
          options={PROFILE_IDS.map((id) => ({ value: id, label: PROFILE_NAME[id] }))}
        />
      </Field>
      <div className={styles.keys}>
        {profiles.isPending ? (
          <Skeleton shape="text" lines={4} />
        ) : profiles.isError ? (
          <p className={styles.note}>
            The keys for this profile could not be loaded. {toMessage(profiles.error)}
          </p>
        ) : profile ? (
          <KeysTable profile={profile} platform={platform} />
        ) : null}
      </div>
    </SetSection>
  );
}

function KeysTable({ profile, platform }: { profile: AppProfile; platform: string }) {
  return (
    <>
      <Table caption={`Keys ${profile.name} receives on ${platform}`} captionHidden>
        <THead>
          <Tr>
            <Th>Action</Th>
            <Th>
              Keys {profile.name} receives on {platform}
            </Th>
          </Tr>
        </THead>
        <TBody>
          {KEY_ROWS.map((action) => {
            const keys = profile.keys[action];
            const unsupported = action !== "jump" && profile.unsupported.includes(action);
            return (
              <Tr key={action}>
                <Td className={styles.muted}>
                  {action === "jump" ? "Jump to slide 3" : ACTION_LABEL[action]}
                </Td>
                <Td>
                  {unsupported || !keys ? (
                    <span className={styles.muted}>Not available in {profile.name}</span>
                  ) : (
                    <span className={styles.keyRow}>
                      <KeyCaps keys={keys} slide={3} />
                      {action === "jump" && profile.jump_strategy === "step_from_home" ? (
                        <span className={styles.muted}>then → twice, from the first page</span>
                      ) : null}
                      {action === "start_show" ? (
                        <span className={styles.muted}>from the current slide</span>
                      ) : null}
                    </span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      {profile.notes ? <p className={styles.note}>{profile.notes}</p> : null}
    </>
  );
}

type RecogniserProps = {
  model: UseQueryResult<ModelCard | null>;
  /** The engine refused `ml` because no model exists (NO_MODEL), as it said on the last save. */
  serverError: string | null;
};

export function RecogniserSection({ model, serverError }: RecogniserProps) {
  const { values, changed, set } = useDraft();
  const card = model.data;
  return (
    <SetSection
      title="Recogniser"
      description="Rules are written by hand and need no data. The trained model learns the same poses from recorded sessions. Both read the same landmarks; switch any time."
    >
      <div className={styles.recogniser}>
        <Segmented
          label="Recogniser"
          value={values.recogniser}
          onValueChange={(next) => set("recogniser", next)}
          options={[
            { value: "rules", label: "Rules" },
            { value: "ml", label: "Trained model", disabled: !card && values.recogniser !== "ml" },
          ]}
        />
        {changed.has("recogniser") ? <span className={styles.tag}>Changed</span> : null}
      </div>
      {model.isPending ? (
        <Skeleton shape="block" />
      ) : model.isError ? (
        <Callout tone="warning" title="The trained model could not be checked">
          {toMessage(model.error)}
        </Callout>
      ) : card ? (
        <div className={styles.card}>
          <p className={styles.cardTitle}>
            <CircleCheck size={16} aria-hidden="true" />
            Trained model available
          </p>
          <p>
            Random forest, trained {formatTrained(card.trained_at)} from {card.participants.length}{" "}
            {card.participants.length === 1 ? "participant" : "participants"} and{" "}
            {card.n_frames.toLocaleString("en-GB")} frames. Leave-one-participant-out macro-F1{" "}
            <span className={styles.number}>{card.lopo_macro_f1.toFixed(2)}</span>.
            {card.synthetic
              ? " Trained on synthetic sessions, so this number shows the pipeline works, not how people perform."
              : ""}{" "}
            Compare it with the rules in the <Link to="/evaluation">Evaluation lab</Link>.
          </p>
        </div>
      ) : (
        <Callout
          tone="info"
          title="No trained model yet"
          action={
            <Link to="/dataset" className={buttonClassName({ size: "sm" })}>
              Train a model in Dataset
            </Link>
          }
        >
          Record a few sessions, then train a model on them. Until then WaveSlide uses the rules.
        </Callout>
      )}
      {serverError ? (
        <Callout tone="danger" title="The trained model could not be switched on">
          {serverError}
        </Callout>
      ) : null}
    </SetSection>
  );
}

function formatTrained(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} at ${time}`;
}
