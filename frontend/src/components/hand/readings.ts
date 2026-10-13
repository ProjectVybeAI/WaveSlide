// The numbers behind the recogniser's pose, for the Live screen's "What the recogniser sees":
// how many of the last 5 frames agree, how fast the palm moves, how far the fingers are spread.
// The engine's frame carries only the landmarks, so these are worked out here with the same
// definitions as backend/app/core (features.py, swipe.py): distances in hand lengths, where one hand
// length is wrist to the middle knuckle.
import { useMemo, useState } from "react";
import type { EngineFrame, HandLandmarks } from "@/api/types";
import { VIEW_H, VIEW_W } from "./landmarks";

const WRIST = 0;
const MIDDLE_KNUCKLE = 9;
const PALM_POINTS = [0, 5, 9, 13, 17];
const FINGERTIPS = [8, 12, 16, 20];
/** The rules recogniser reports a pose when 4 of the last 5 frames agree. */
const VOTE_WINDOW = 5;
/** Palm speed is the distance travelled in this long (swipe.py SPEED_WINDOW_S). */
const SPEED_WINDOW_S = 0.2;
/** A longer gap between frames means the hand was lost: start counting again. */
const MAX_GAP_S = 0.25;

type Point = readonly [number, number];

/** A landmark in image-height units (x is scaled by the 4:3 picture, so distances are not skewed). */
function point(hand: HandLandmarks, index: number): Point {
  const [x = 0, y = 0] = hand.landmarks[index] ?? [];
  return [(x * VIEW_W) / VIEW_H, y];
}
const gap = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function handLength(hand: HandLandmarks): number {
  return gap(point(hand, WRIST), point(hand, MIDDLE_KNUCKLE));
}

export function palmCentre(hand: HandLandmarks): Point {
  const points = PALM_POINTS.map((index) => point(hand, index));
  return [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];
}

/** Mean gap between neighbouring fingertips (index to little), in hand lengths. Null for a degenerate hand. */
export function fingerSpread(hand: HandLandmarks): number | null {
  const length = handLength(hand);
  if (length < 1e-6) return null;
  const tips = FINGERTIPS.map((index) => point(hand, index));
  const gaps = tips.slice(1).map((tip, i) => gap(tip, tips[i] as Point));
  return gaps.reduce((sum, g) => sum + g, 0) / gaps.length / length;
}

/** "5 of last 5 frames": the rules recogniser's confidence is the share of agreeing frames. */
export function agreementFrames(confidence: number): number {
  return Math.round(Math.min(Math.max(confidence, 0), 1) * VOTE_WINDOW);
}
export const AGREEMENT_WINDOW = VOTE_WINDOW;

type Sample = { t: number; centre: Point; length: number };

/** Keeps the last fraction of a second of palm positions and says how far the hand got in it. */
export class PalmTracker {
  private samples: Sample[] = [];

  push(t: number, hand: HandLandmarks | undefined) {
    if (!hand) {
      this.samples = [];
      return;
    }
    const last = this.samples.at(-1);
    if (last && (t - last.t > MAX_GAP_S || t < last.t)) this.samples = [];
    this.samples.push({ t, centre: palmCentre(hand), length: handLength(hand) });
    this.samples = this.samples.filter((sample) => t - sample.t <= SPEED_WINDOW_S);
  }

  /** Hand lengths per second; the farthest earlier position counts, so a wave still reads as moving. */
  speed(): number | null {
    const now = this.samples.at(-1);
    if (!now || now.length < 1e-6) return null;
    const reach = Math.max(...this.samples.map((sample) => gap(now.centre, sample.centre)));
    return reach / now.length / SPEED_WINDOW_S;
  }
}

export type Readings = {
  /** Frames that agree with the pose, of the last 5; null when the trained model decides. */
  agreement: number | null;
  /** Hand lengths per second. */
  speed: number | null;
  /** Hand lengths. */
  spread: number | null;
};

/** The readings for the latest frame; empty while there is no hand. */
export function useReadings(frame: EngineFrame | null): Readings {
  const [tracker] = useState(() => new PalmTracker());
  const hand = frame?.hands[0];
  const speed = useMemo(() => {
    if (!frame) return null;
    tracker.push(frame.t, hand);
    return tracker.speed();
  }, [tracker, frame, hand]);
  if (!frame || !hand) return { agreement: null, speed: null, spread: null };
  return {
    agreement: frame.recogniser === "rules" ? agreementFrames(frame.confidence) : null,
    speed,
    spread: fingerSpread(hand),
  };
}
