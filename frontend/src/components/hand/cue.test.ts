import examples from "@/mocks/fixtures/examples.json";
import type { CommandLogEntry, EngineFrame } from "@/api/types";
import { deriveCue, type CueInput } from "./cue";

const frame = examples.engineFrame as EngineFrame;
const command = examples.command as CommandLogEntry;

const base: CueInput = {
  frame: { ...frame, hold: null, state: "ACTIVE" },
  connected: true,
  waited: false,
  cameraOk: true,
  fired: null,
  blocked: null,
  cancelled: null,
  lastCommand: command,
  cooldownMs: 800,
};

describe("deriveCue", () => {
  it("is on standby while a hold fills, with the target and the time left", () => {
    const cue = deriveCue({ ...base, frame: { ...frame, state: "HOLDING" } });
    expect(cue.mode).toBe("standby");
    expect(cue.word).toBe("Standby");
    expect(cue.target).toBe("Jump to slide 3");
    expect(cue.detail).toBe("0.3 s left, keep still");
    expect(cue.ring).toMatchObject({ state: "standby", progress: 0.7, label: "3", caption: "Slide" });
  });

  it("offers to go live when a thumbs up is held while paused", () => {
    const hold = {
      action: "toggle_active" as const,
      label: "Live",
      caption: "Go",
      progress: 0.5,
      hold_ms: 1000,
    };
    const cue = deriveCue({ ...base, frame: { ...frame, active: false, state: "PAUSED", hold } });
    expect(cue.target).toBe("Go live");
    expect(cue.detail).toBe("0.5 s left, keep still");
  });

  it("goes solid when a command fires, and says what was sent", () => {
    const cue = deriveCue({ ...base, fired: command });
    expect(cue.mode).toBe("go");
    expect(cue.ring.state).toBe("go");
    expect(cue.target).toBe("Slide 3 sent");
  });

  it("drains a cooldown arc over the configured cooldown", () => {
    const cue = deriveCue({
      ...base,
      frame: { ...frame, hold: null, state: "COOLDOWN", cooldown_ms_left: 400 },
    });
    expect(cue.mode).toBe("cooldown");
    expect(cue.ring.cooldown).toBeCloseTo(0.5);
    expect(cue.ring.label).toBe("3");
  });

  it("explains a cancelled hold in words and keeps the sweep where it stopped, in grey", () => {
    const cue = deriveCue({
      ...base,
      cancelled: { reason: "pose_changed", hold: frame.hold },
    });
    expect(cue.mode).toBe("cancelled");
    expect(cue.ring.state).toBe("cancel");
    expect(cue.target).toMatch(/Pose changed/);
  });

  it("says a key was held back and what to do", () => {
    const cue = deriveCue({
      ...base,
      blocked: { ...command, action: "next", blocked_reason: "focus: WaveSlide had focus" },
    });
    expect(cue.mode).toBe("blocked");
    expect(cue.word).toBe("Not sent");
    expect(cue.target).toMatch(/Click your slides first/);
  });

  it("asks for a hand when live and none is in view, and says hands are free when paused", () => {
    expect(deriveCue({ ...base, frame: { ...frame, hands: [], hold: null, state: "ACTIVE" } }).mode).toBe(
      "nohand",
    );
    expect(deriveCue({ ...base, frame: { ...frame, active: false, hold: null, state: "PAUSED" } }).mode).toBe(
      "paused",
    );
    expect(deriveCue(base).mode).toBe("ready");
  });

  it("reports a lost camera and a lost engine before anything else", () => {
    expect(deriveCue({ ...base, cameraOk: false }).word).toBe("No camera");
    expect(deriveCue({ ...base, connected: false }).word).toBe("No engine");
    expect(deriveCue({ ...base, connected: false, frame: null }).mode).toBe("connecting");
    expect(deriveCue({ ...base, connected: false, frame: null, waited: true }).mode).toBe("error");
  });
});
