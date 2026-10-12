// The cue for the current moment: the latest engine frame plus the short-lived things events say
// (a command that just fired, a key held back, a hold cancelled). Each lasts a fixed window, then
// the cue falls back to what the frame says (cooldown, ready, paused).
import { useCallback, useEffect, useRef, useState } from "react";
import { engineSocket, useEngineEvents, useEngineFrame, useSocketStatus } from "@/api/engineSocket";
import type { CommandLogEntry, EngineEvent, EngineFrame, HoldInfo } from "@/api/types";
import { deriveCue, type Cue, type CueInput } from "./cue";

const CONNECT_WAIT_MS = 2500;
const WINDOW_MS = { fired: 450, blocked: 3500, cancelled: 2000 } as const;

type Recent =
  | { kind: "fired" | "blocked"; seq: number; command: CommandLogEntry }
  | {
      kind: "cancelled";
      seq: number;
      reason: NonNullable<CueInput["cancelled"]>["reason"];
      hold: HoldInfo | null;
    };

type Options = {
  /** settings.timing.cooldown_ms and activation_cooldown_ms; the arc drains over the right one. */
  cooldownMs?: number;
  activationCooldownMs?: number;
  /** The engine's last command, shown until one arrives over the socket. */
  seedCommand?: CommandLogEntry | null;
  /** The REST snapshot says the camera is fine (true while unknown). */
  cameraOk?: boolean;
};

export type CueState = {
  cue: Cue;
  frame: EngineFrame | null;
  connected: boolean;
  lastCommand: CommandLogEntry | null;
  /** True for a moment after a command fired: the "Last" line takes the new action. */
  fresh: boolean;
  /** The last command was held back by the focus guard. */
  lastBlocked: boolean;
};

export function useCue({
  cooldownMs = 800,
  activationCooldownMs = 1500,
  seedCommand = null,
  cameraOk = true,
}: Options = {}): CueState {
  const frame = useEngineFrame();
  const status = useSocketStatus();
  const sequence = useRef(0);
  const [recent, setRecent] = useState<Recent | null>(null);
  const [expired, setExpired] = useState(0);
  const [sent, setSent] = useState<CommandLogEntry | null>(null);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), CONNECT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const onEvent = useCallback((event: EngineEvent) => {
    const seq = ++sequence.current;
    if (event.kind === "command") {
      const blocked = Boolean(event.command.blocked_reason);
      setRecent({ kind: blocked ? "blocked" : "fired", seq, command: event.command });
      setSent(event.command);
    } else if (event.kind === "hold_cancelled") {
      // The frame that carried the hold is usually still the latest one when the event arrives.
      setRecent({
        kind: "cancelled",
        seq,
        reason: event.reason,
        hold: engineSocket.getFrame()?.hold ?? null,
      });
    }
  }, []);
  useEngineEvents(onEvent);

  const recentSeq = recent?.seq;
  const recentKind = recent?.kind;
  useEffect(() => {
    if (recentSeq === undefined || recentKind === undefined) return undefined;
    const timer = setTimeout(() => setExpired(recentSeq), WINDOW_MS[recentKind]);
    return () => clearTimeout(timer);
  }, [recentSeq, recentKind]);

  const live = recent && expired < recent.seq ? recent : null;
  const lastCommand = sent ?? seedCommand;
  const total = lastCommand?.action === "toggle_active" ? activationCooldownMs : cooldownMs;

  const cue = deriveCue({
    frame,
    connected: status === "open",
    waited,
    cameraOk,
    fired: live?.kind === "fired" ? live.command : null,
    blocked: live?.kind === "blocked" ? live.command : null,
    cancelled: live?.kind === "cancelled" ? { reason: live.reason, hold: live.hold } : null,
    lastCommand,
    cooldownMs: total,
  });
  return {
    cue,
    frame,
    connected: status === "open",
    lastCommand,
    fresh: live?.kind === "fired",
    lastBlocked: Boolean(lastCommand?.blocked_reason),
  };
}
