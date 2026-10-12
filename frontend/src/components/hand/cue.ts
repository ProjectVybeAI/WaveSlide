// What the cue dial and its words say, worked out from the engine's frame and recent events.
// Pure functions (no React), so every state in DESIGN.md "Overlay states" is testable: paused, going
// live, ready, standby, go, cooldown, cancelled, no hand, not sent, no camera.
import type { CommandLogEntry, EngineFrame, HoldInfo } from "@/api/types";
import type { Action } from "./types";
import type { RingState } from "./HoldRing";

export const ACTION_LABEL: Record<Action, string> = {
  next: "Next slide",
  previous: "Previous slide",
  blank_toggle: "Blank or unblank",
  toggle_active: "Pause or go live",
  start_show: "Start slideshow",
  exit_show: "Exit slideshow",
  jump: "Jump to slide",
};

/** What a command did, for the log and the overlay's "Last" line: "Jump to slide 3", "Next slide". */
export function commandLabel(command: Pick<CommandLogEntry, "action" | "slide">): string {
  if (command.action === "jump") return command.slide ? `Jump to slide ${command.slide}` : "Jump to a slide";
  return ACTION_LABEL[command.action];
}

/** The short target inside the dial: "3", "Next", "Blank". */
export function ringTarget(action: Action, slide?: number | null): { label: string; caption: string } {
  switch (action) {
    case "jump":
      return { label: slide ? String(slide) : "Jump", caption: "Slide" };
    case "next":
      return { label: "Next", caption: "Slide" };
    case "previous":
      return { label: "Back", caption: "Slide" };
    case "blank_toggle":
      return { label: "Blank", caption: "Screen" };
    case "toggle_active":
      return { label: "Live", caption: "Go" };
    case "start_show":
      return { label: "Start", caption: "Show" };
    case "exit_show":
      return { label: "Exit", caption: "Show" };
  }
}

/** The sentence under "Standby": what will happen if the hold completes. */
function holdTarget(hold: HoldInfo, active: boolean): string {
  switch (hold.action) {
    case "jump":
      return `Jump to slide ${hold.label}`;
    case "blank_toggle":
      return "Blank the screen";
    case "toggle_active":
      return active ? "Pause gestures" : "Go live";
    case "next":
      return "Next slide";
    case "previous":
      return "Previous slide";
    case "start_show":
      return "Start the slideshow";
    case "exit_show":
      return "Exit the slideshow";
  }
}

function sentSentence(command: CommandLogEntry, active: boolean): string {
  switch (command.action) {
    case "jump":
      return `Slide ${command.slide ?? ""} sent`.replace("  ", " ");
    case "blank_toggle":
      return "Blank toggled";
    case "toggle_active":
      return active ? "You are live" : "Gestures paused";
    case "start_show":
      return "Slideshow started";
    case "exit_show":
      return "Slideshow ended";
    default:
      return `${ACTION_LABEL[command.action]} sent`;
  }
}

/** Why a key was held back, in words the presenter can act on. */
export function blockedMessage(reason: string): string {
  if (/focus/i.test(reason)) return "Click your slides first, then try again";
  return reason;
}

/** The result column of the command log: "Not sent: WaveSlide had focus". */
export function blockedReasonLabel(reason: string): string {
  return /focus/i.test(reason) ? "WaveSlide had focus" : reason;
}

export const CANCEL_REASON: Record<"pose_changed" | "moved" | "hand_lost", string> = {
  pose_changed: "Pose changed. Hold still to try again",
  moved: "Your hand moved. Hold still to try again",
  hand_lost: "Hand left the view. Nothing was sent",
};

export type CueMode =
  | "connecting"
  | "error"
  | "camera"
  | "paused"
  | "ready"
  | "nohand"
  | "standby"
  | "go"
  | "cooldown"
  | "cancelled"
  | "blocked";

export type Cue = {
  mode: CueMode;
  ring: {
    state: RingState;
    progress: number;
    holdMs: number;
    label: string;
    caption: string;
    cooldown: number;
  };
  /** The state word: Standby, Go, Cooldown. */
  word: string;
  /** What it means in a sentence. */
  target: string;
  /** A changing figure that is not announced to screen readers ("0.3 s left, keep still"). */
  detail: string;
};

export type CueInput = {
  frame: EngineFrame | null;
  /** The WebSocket is open. */
  connected: boolean;
  /** The first connection attempt has had its few seconds; if it still failed, say so. */
  waited: boolean;
  /** False when the engine reports the camera lost. */
  cameraOk: boolean;
  /** A command that fired a moment ago (the Go window). */
  fired: CommandLogEntry | null;
  /** A command the focus guard held back a moment ago. */
  blocked: CommandLogEntry | null;
  /** A hold that was cancelled a moment ago, with the last hold the frame showed. */
  cancelled: { reason: keyof typeof CANCEL_REASON; hold: HoldInfo | null } | null;
  /** The newest command that was sent, for the cooldown arc's target. */
  lastCommand: CommandLogEntry | null;
  /** The cooldown that started when it fired, in ms (settings.timing). */
  cooldownMs: number;
};

const IDLE_RING: Cue["ring"] = {
  state: "idle",
  progress: 0,
  holdMs: 1000,
  label: "",
  caption: "",
  cooldown: 0,
};
const idle = (extra: Partial<Cue["ring"]> = {}): Cue["ring"] => ({ ...IDLE_RING, ...extra });

export const secondsLeft = (hold: HoldInfo) => ((1 - hold.progress) * hold.hold_ms) / 1000;

export function deriveCue(input: CueInput): Cue {
  const { frame, connected, waited, cameraOk, fired, blocked, cancelled, lastCommand, cooldownMs } = input;
  const active = frame?.active ?? false;

  if (!connected && !frame && !waited) {
    return {
      mode: "connecting",
      ring: idle(),
      word: "Connecting",
      target: "Waiting for the engine",
      detail: "",
    };
  }
  if (!connected) {
    return {
      mode: "error",
      ring: idle(),
      word: "No engine",
      target: "WaveSlide is not running. This window reconnects by itself",
      detail: "",
    };
  }
  if (!cameraOk) {
    return {
      mode: "camera",
      ring: idle(),
      word: "No camera",
      target: "Gestures are off until it is back",
      detail: "",
    };
  }
  if (blocked) {
    const { label } = ringTarget(blocked.action, blocked.slide);
    return {
      mode: "blocked",
      ring: idle({ label, caption: "Blocked" }),
      word: "Not sent",
      target: blockedMessage(blocked.blocked_reason ?? ""),
      detail: "",
    };
  }
  if (fired) {
    const { label, caption } = ringTarget(fired.action, fired.slide);
    const holdMs = fired.action === "jump" ? 1000 : 800;
    return {
      mode: "go",
      ring: { state: "go", progress: 1, holdMs, label, caption, cooldown: 1 },
      word: "Go",
      target: sentSentence(fired, active),
      detail: "",
    };
  }
  if (frame?.hold) {
    const { hold } = frame;
    return {
      mode: "standby",
      ring: {
        state: "standby",
        progress: hold.progress,
        holdMs: hold.hold_ms,
        label: hold.label,
        caption: hold.caption,
        cooldown: 0,
      },
      word: "Standby",
      target: holdTarget(hold, active),
      detail: `${secondsLeft(hold).toFixed(1)} s left, keep still`,
    };
  }
  if (cancelled) {
    const { hold } = cancelled;
    return {
      mode: "cancelled",
      ring: hold
        ? {
            state: "cancel",
            progress: hold.progress,
            holdMs: hold.hold_ms,
            label: hold.label,
            caption: hold.caption,
            cooldown: 0,
          }
        : idle(),
      word: "Cancelled",
      target: CANCEL_REASON[cancelled.reason],
      detail: "",
    };
  }
  if (frame?.state === "COOLDOWN" && frame.cooldown_ms_left > 0) {
    const { label } = lastCommand ? ringTarget(lastCommand.action, lastCommand.slide) : { label: "" };
    return {
      mode: "cooldown",
      ring: {
        state: "cooldown",
        progress: 0,
        holdMs: 1000,
        label,
        caption: "Sent",
        cooldown: Math.min(1, frame.cooldown_ms_left / Math.max(1, cooldownMs)),
      },
      word: "Cooldown",
      target: "Lower your hand to arm the next gesture",
      detail: `${(frame.cooldown_ms_left / 1000).toFixed(1)} s`,
    };
  }
  if (!active) {
    return { mode: "paused", ring: idle(), word: "Hands free", target: "Talk and move freely", detail: "" };
  }
  if (!frame || frame.hands.length === 0) {
    return {
      mode: "nohand",
      ring: idle(),
      word: "No hand",
      target: "Raise your hand into the camera's view",
      detail: "",
    };
  }
  return {
    mode: "ready",
    ring: idle(),
    word: "Ready",
    target: "Swipe, or hold up fingers to jump",
    detail: "",
  };
}

/** What a screen reader hears for the ring: the state and its target. */
export function describeCue(cue: Cue): string {
  return cue.detail ? `${cue.word}, ${cue.target}, ${cue.detail}` : `${cue.word}, ${cue.target}`;
}

export function recogniserName(recogniser: EngineFrame["recogniser"]): string {
  return recogniser === "ml" ? "Trained model" : "Rules";
}
