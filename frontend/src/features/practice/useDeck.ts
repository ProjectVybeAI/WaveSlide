// The deck's controls: the keyboard (arrows, number then Enter, B) and the engine's `command` events.
// The engine sends events to the deck only while the practice profile is active (`dry_run`); each
// one moves the deck and is acknowledged over the socket so the engine can time key to slide.
import { useCallback, useEffect, useReducer, useState } from "react";
import { engineSocket, useEngineEvents } from "@/api/engineSocket";
import type { CommandLogEntry, EngineEvent } from "@/api/types";
import { commandLabel } from "@/components/hand/cue";
import { deckReducer, START, type DeckMove } from "./deck";

/** What the rail shows after the last gesture. */
export type Ack = {
  title: string;
  /** Frame capture to key sent. */
  captureToKey: number;
  /** Key sent to the slide on screen, measured here; null if it could not be measured. */
  keyToSlide: number | null;
};

const MAX_PLAUSIBLE_MS = 5000;

function moveFor(command: CommandLogEntry): DeckMove | null {
  switch (command.action) {
    case "next":
      return { type: "next" };
    case "previous":
      return { type: "previous" };
    case "jump":
      return command.slide ? { type: "jump", slide: command.slide } : null;
    case "blank_toggle":
      return { type: "blank" };
    default:
      return null;
  }
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export function useDeck() {
  const [deck, move] = useReducer(deckReducer, START);
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState<Ack | null>(null);

  const onEvent = useCallback((event: EngineEvent) => {
    if (event.kind !== "command" || !event.command.dry_run || event.command.blocked_reason) return;
    const command = event.command;
    const next = moveFor(command);
    if (!next) return;
    move(next);
    // After the browser has painted the new slide, tell the engine and note how long the key took.
    requestAnimationFrame(() => {
      const elapsed = Date.now() - command.t * 1000;
      engineSocket.send({ type: "deck_ack", command_id: command.id, t: Date.now() / 1000 });
      setAck({
        title: commandLabel(command),
        captureToKey: command.pipeline_ms,
        keyToSlide: elapsed >= 0 && elapsed < MAX_PLAUSIBLE_MS ? elapsed : null,
      });
    });
  }, []);
  useEngineEvents(onEvent);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target))
        return;
      if (/^[0-9]$/.test(event.key)) {
        setTyped((digits) => (digits + event.key).slice(-2));
        return;
      }
      if (event.key === "Enter") {
        if (!typed) return;
        event.preventDefault(); // a focused button must not also click
        move({ type: "jump", slide: Number(typed) });
        setTyped("");
        return;
      }
      if (event.key === "ArrowRight") move({ type: "next" });
      else if (event.key === "ArrowLeft") move({ type: "previous" });
      else if (event.key === "b" || event.key === "B") move({ type: "blank" });
      else return;
      setTyped("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typed]);

  // Typed digits that never get their Enter are dropped after a moment.
  useEffect(() => {
    if (!typed) return undefined;
    const timer = setTimeout(() => setTyped(""), 3000);
    return () => clearTimeout(timer);
  }, [typed]);

  return { deck, move, typed, ack };
}
