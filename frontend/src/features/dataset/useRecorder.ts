// The guided recorder's state: the step the engine is on and when we heard about it. The engine
// announces every step as a `recording_prompt` event ("Hold up 3 fingers", for 4 s); the countdown
// is worked out here from the moment the prompt arrived, so the engine does not stream seconds.
import { useCallback, useEffect, useState } from "react";
import { useEngineEvents } from "@/api/engineSocket";
import type { EngineEvent } from "@/api/types";
import type { Gesture } from "@/components/hand/types";

export type RecorderPrompt = {
  sessionId: string;
  step: number;
  totalSteps: number;
  prompt: string;
  /** The pose to show for this step; null while resting or talking. */
  gesture: Gesture | null;
  /** How long the step lasts; null until the first prompt event (the start response has no timing). */
  seconds: number | null;
  /** Date.now() when this step was announced. */
  receivedAt: number;
};

type PromptEvent = Extract<EngineEvent, { kind: "recording_prompt" }>;

export function toPrompt(event: PromptEvent, receivedAt: number): RecorderPrompt {
  return {
    sessionId: event.session_id,
    step: event.step,
    totalSteps: event.total_steps,
    prompt: event.prompt,
    gesture: event.gesture ?? null,
    seconds: event.seconds,
    receivedAt,
  };
}

export function useRecorder() {
  const [prompt, setPrompt] = useState<RecorderPrompt | null>(null);
  useEngineEvents(
    useCallback((event) => {
      if (event.kind === "recording_prompt") setPrompt(toPrompt(event, Date.now()));
    }, []),
  );
  const begin = useCallback((first: Omit<RecorderPrompt, "gesture" | "seconds" | "receivedAt">) => {
    setPrompt({ ...first, gesture: null, seconds: null, receivedAt: Date.now() });
  }, []);
  const clear = useCallback(() => setPrompt(null), []);
  return { prompt, begin, clear };
}

/** The current time, refreshed every `intervalMs`; drives the countdown. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Seconds left in the step, or null while its length is not known yet. */
export function secondsLeft(prompt: RecorderPrompt, now: number): number | null {
  if (prompt.seconds === null) return null;
  return Math.max(0, prompt.seconds - (now - prompt.receivedAt) / 1000);
}
