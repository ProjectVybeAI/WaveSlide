import { describe, expect, it } from "vitest";
import type { HandLandmarks } from "@/api/types";
import { agreementFrames, fingerSpread, PalmTracker } from "./readings";

/** A hand with every landmark on the wrist, then the points that matter moved. */
function hand(moves: Record<number, [number, number]>): HandLandmarks {
  const landmarks = Array.from({ length: 21 }, () => [0.5, 0.8, 0]);
  for (const [index, [x, y]] of Object.entries(moves)) landmarks[Number(index)] = [x, y, 0];
  return { handedness: "Right", score: 1, landmarks };
}

describe("readings", () => {
  it("counts agreeing frames from the rules confidence", () => {
    expect(agreementFrames(1)).toBe(5);
    expect(agreementFrames(0.8)).toBe(4);
  });

  it("measures finger spread in hand lengths", () => {
    // Hand length 0.2 (wrist to middle knuckle); fingertips 0.1 apart in image height.
    const spread = fingerSpread(
      hand({ 9: [0.5, 0.6], 8: [0.4, 0.4], 12: [0.5, 0.4], 16: [0.6, 0.4], 20: [0.7, 0.4] }),
    );
    expect(spread).toBeCloseTo((0.1 * 640) / 480 / 0.2, 5);
  });

  it("has no spread for a hand with no length", () => {
    expect(fingerSpread(hand({}))).toBeNull();
  });

  it("reads palm speed as the distance moved in 0.2 s, in hand lengths", () => {
    const tracker = new PalmTracker();
    // The whole palm slides sideways; the hand stays 0.2 high.
    const at = (x: number) => hand({ 0: [x, 0.8], 5: [x, 0.7], 9: [x, 0.6], 13: [x, 0.7], 17: [x, 0.7] });
    tracker.push(0, at(0.5));
    tracker.push(0.1, at(0.55));
    tracker.push(0.2, at(0.6));
    // 0.1 of the picture width moved in 0.2 s; the hand is 0.2 high.
    const moved = (0.1 * 640) / 480;
    expect(tracker.speed()).toBeCloseTo(moved / 0.2 / 0.2, 3);
  });

  it("starts again when the hand was lost", () => {
    const tracker = new PalmTracker();
    tracker.push(0, hand({ 9: [0.5, 0.6] }));
    tracker.push(1, hand({ 9: [0.9, 0.6] }));
    expect(tracker.speed()).toBe(0);
  });
});
