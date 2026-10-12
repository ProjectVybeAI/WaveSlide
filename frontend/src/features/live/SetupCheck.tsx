// The setup check: four ruled cells (camera, keyboard control, app profile, where keys go). When
// something is missing it says what, and a callout under the strip gives the fix step by step.
import type { ReactNode } from "react";
import { KeyCaps } from "@/components/hand/KeyCaps";
import { Callout, Skeleton, StatusPill, type StatusTone } from "@/components/ui";
import type { AppProfile, CameraInfo, Health } from "@/api/types";
import { formatFps } from "@/lib/format";
import { profileName } from "@/features/settings/settingsSchema";
import styles from "./SetupCheck.module.css";

type Cell = { tone: StatusTone; title: string; detail: ReactNode };

type Props = {
  health: Health;
  profile: AppProfile | undefined;
  profileId: string;
  camera: CameraInfo | undefined;
  cameraOk: boolean;
  fps: number | undefined;
  replaySession: string | null;
};

const PLATFORM_NAME = { darwin: "macOS", win32: "Windows", other: "this computer" } as const;

function cameraCell({ health, camera, cameraOk, fps, replaySession }: Props): Cell {
  if (health.source === "replay" || replaySession) {
    return {
      tone: "info",
      title: "Replaying a session",
      detail: `${replaySession ?? "A recorded session"}. No camera needed.`,
    };
  }
  if (health.permissions.camera === "denied") {
    return {
      tone: "danger",
      title: "Camera blocked",
      detail: "WaveSlide is not allowed to use the camera. Steps are below.",
    };
  }
  if (!cameraOk) {
    return {
      tone: "danger",
      title: "Camera unavailable",
      detail: "Another app may be using it, or it was unplugged.",
    };
  }
  const name = camera?.name ?? "Camera";
  return { tone: "success", title: "Camera ready", detail: `${name}${fps ? `, ${formatFps(fps)}` : ""}` };
}

function keyboardCell({ health }: Props): Cell {
  if (health.keys_mode === "record") {
    return {
      tone: "info",
      title: "Keys are recorded, not sent",
      detail: "Nothing reaches your slides in this mode.",
    };
  }
  switch (health.permissions.keyboard) {
    case "granted":
      return {
        tone: "success",
        title: "Keyboard control allowed",
        detail:
          health.platform === "darwin" ? "Accessibility permission is on." : "WaveSlide can press keys.",
      };
    case "denied":
      return {
        tone: "danger",
        title: "Keyboard control blocked",
        detail: "WaveSlide cannot press keys yet. Steps are below.",
      };
    case "not_required":
      return {
        tone: "success",
        title: "Keyboard control allowed",
        detail: "No permission is needed on this computer.",
      };
    default:
      return {
        tone: "warning",
        title: "Keyboard control not checked",
        detail: "WaveSlide could not read the permission.",
      };
  }
}

function profileCell({ health, profile, profileId }: Props): Cell {
  const name = profileName(profileId);
  if (!profile) return { tone: "info", title: `${name} profile`, detail: "Loading its keys." };
  const blank = profile.keys.blank_toggle;
  const blankText = profile.unsupported.includes("blank_toggle") ? (
    "There is no blank screen."
  ) : (
    <>
      Blank is <KeyCaps keys={blank ?? []} />,{" "}
    </>
  );
  const jump =
    profile.jump_strategy === "type_number" ? (
      <>
        jump is number then <KeyCaps keys={["enter"]} />
      </>
    ) : (
      "jump steps from the first page"
    );
  return {
    tone: "info",
    title: `${name} profile`,
    detail: (
      <>
        {PLATFORM_NAME[health.platform]} keys. {blankText} {jump}.
      </>
    ),
  };
}

function focusCell({ profileId }: Props): Cell {
  if (profileId === "practice") {
    return {
      tone: "info",
      title: "Keys go to the practice deck",
      detail: "Open the Practice deck to try your gestures.",
    };
  }
  return {
    tone: "warning",
    title: "Keys go to the front app",
    detail: "Click your slides once before you present.",
  };
}

export function SetupCheck(props: Props) {
  const cells = [cameraCell(props), keyboardCell(props), profileCell(props), focusCell(props)];
  return (
    <section aria-labelledby="setup-title" className={styles.wrap}>
      <h2 id="setup-title" className="visually-hidden">
        Setup check
      </h2>
      <ul className={styles.cells}>
        {cells.map((cell) => (
          <li key={cell.title} className={styles.cell}>
            <StatusPill tone={cell.tone} className={styles.pill}>
              {cell.title}
            </StatusPill>
            <p className={styles.detail}>{cell.detail}</p>
          </li>
        ))}
      </ul>
      <Fixes health={props.health} />
    </section>
  );
}

/** Step-by-step fixes, shown only for what is actually blocked. */
function Fixes({ health }: { health: Health }) {
  const mac = health.platform === "darwin";
  const keyboardBlocked = health.keys_mode !== "record" && health.permissions.keyboard === "denied";
  const cameraBlocked = health.source === "camera" && health.permissions.camera === "denied";
  if (!keyboardBlocked && !cameraBlocked) return null;
  return (
    <div className={styles.fixes}>
      {keyboardBlocked ? (
        <Callout tone="danger" title="WaveSlide cannot press keys yet">
          <ol className={styles.steps}>
            {mac ? (
              <>
                <li>Open System Settings, then Privacy and Security, then Accessibility.</li>
                <li>Turn on the app that started WaveSlide: Terminal, or WaveSlide itself.</li>
                <li>Quit WaveSlide and start it again. macOS reads this permission only at launch.</li>
              </>
            ) : (
              <>
                <li>Close WaveSlide and start it again as the same user as your presentation app.</li>
                <li>If your presentation app runs as administrator, start WaveSlide as administrator too.</li>
              </>
            )}
          </ol>
        </Callout>
      ) : null}
      {cameraBlocked ? (
        <Callout tone="danger" title="WaveSlide cannot use the camera">
          <ol className={styles.steps}>
            {mac ? (
              <>
                <li>Open System Settings, then Privacy and Security, then Camera.</li>
                <li>Turn on the app that started WaveSlide.</li>
                <li>Quit WaveSlide and start it again.</li>
              </>
            ) : (
              <>
                <li>Open Settings, then Privacy and security, then Camera.</li>
                <li>Allow desktop apps to use the camera, then start WaveSlide again.</li>
              </>
            )}
          </ol>
        </Callout>
      ) : null}
    </div>
  );
}

export function SetupCheckSkeleton() {
  return (
    <ul className={styles.cells} aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <li key={index} className={styles.cell}>
          <Skeleton shape="text" width="3/4" />
          <Skeleton shape="text" width="full" />
        </li>
      ))}
    </ul>
  );
}
