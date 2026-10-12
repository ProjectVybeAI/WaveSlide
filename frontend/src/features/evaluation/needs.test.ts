import type { SessionSummary } from "@/api/types";
import { evaluationNeeds } from "./needs";

const session = (over: Partial<SessionSummary>): SessionSummary => ({
  id: "s",
  kind: "gestures",
  source: "recorded",
  participant: "p1",
  distance_m: 1,
  lighting: "normal",
  luminance_mean: 120,
  n_frames: 100,
  duration_s: 10,
  created_at: "2026-10-01T00:00:00+00:00",
  ...over,
});

describe("evaluationNeeds", () => {
  it("counts recorded people per protocol, distances and lights, and ignores synthetic sessions", () => {
    const needs = evaluationNeeds(
      [
        session({ id: "a" }),
        session({ id: "b", participant: "p2", distance_m: 2, lighting: "dim" }),
        session({ id: "c", kind: "talking" }),
        session({ id: "d", participant: "p9", source: "synthetic" }),
      ],
      false,
    );
    const have = Object.fromEntries(needs.map((need) => [need.label, `${need.have} of ${need.want}`]));
    expect(have["Participants with a gestures session"]).toBe("2 of 2");
    expect(have["Talking sessions, 3 minutes each"]).toBe("1 of 2");
    expect(have["Distances 0.5, 1, 1.5 and 2 m"]).toBe("2 of 4");
    expect(have["Bright, normal and dim light"]).toBe("2 of 3");
    expect(have["Trained model"]).toBe("0 of 1");
  });

  it("starts from nothing on an empty dataset", () => {
    const needs = evaluationNeeds([], true);
    expect(needs.slice(0, 4).every((need) => need.have === 0)).toBe(true);
    expect(needs[4]?.have).toBe(1);
  });
});
