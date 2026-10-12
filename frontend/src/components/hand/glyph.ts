// The geometry behind PoseGlyph: each pose is drawn from the same 21 landmarks the recogniser reads,
// built from finger-bend templates in hand-length units (1 = wrist to middle knuckle), then reduced to
// a pictogram: palm outline, extended fingers as straight strokes with a tip dot, curled fingers as stubs.
import type { components } from "@/api/schema";

export type GlyphPose = components["schemas"]["Gesture"] | components["schemas"]["Pose"];
type Point = readonly [number, number];
type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";
type Fan = "normal" | "together" | "spread";
type ThumbStyle = "out" | "side" | "folded" | "left";

export type GlyphShape =
  | { kind: "line"; tone: "bone" | "lit" | "motion"; from: Point; to: Point }
  | { kind: "path"; tone: "bone" | "lit"; d: string }
  | { kind: "dot"; at: Point; r: number };

const FINGER_IDS: Record<FingerName, readonly number[]> = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};
const FOUR: FingerName[] = ["index", "middle", "ring", "pinky"];
const KNUCKLE: Record<string, Point> = {
  index: [-0.36, -0.93],
  middle: [-0.04, -1.0],
  ring: [0.25, -0.93],
  pinky: [0.5, -0.79],
};
const LENGTH: Record<string, readonly number[]> = {
  index: [0.4, 0.24, 0.2],
  middle: [0.45, 0.28, 0.21],
  ring: [0.42, 0.26, 0.2],
  pinky: [0.33, 0.2, 0.18],
};
const FAN: Record<Fan, Record<string, number>> = {
  normal: { index: -99, middle: -91, ring: -83, pinky: -74 },
  together: { index: -94, middle: -90, ring: -86, pinky: -82 },
  spread: { index: -112, middle: -93, ring: -75, pinky: -58 },
};
const THUMB: Record<ThumbStyle, { dirs: number[]; scale: number[] }> = {
  out: { dirs: [-128, -134, -140], scale: [1, 1, 1] },
  side: { dirs: [-118, -112, -106], scale: [1, 1, 1] },
  folded: { dirs: [-112, -38, -8], scale: [1, 0.8, 0.72] },
  left: { dirs: [-162, -176, -180], scale: [1, 1, 1] },
};

type PoseDef = { extended: FingerName[]; fan?: Fan; thumb?: ThumbStyle; rotate?: number; swipe?: 1 | -1 };
const ALL: FingerName[] = ["index", "middle", "ring", "pinky", "thumb"];
const POSES: Record<GlyphPose, PoseDef> = {
  NONE: { extended: ["index", "middle"], thumb: "side" },
  FIST: { extended: [] },
  OPEN_PALM: { extended: ALL, fan: "together", thumb: "side" },
  THUMBS_UP: { extended: ["thumb"], thumb: "left", rotate: 90 },
  THUMBS_DOWN: { extended: ["thumb"], thumb: "left", rotate: -90 },
  COUNT_1: { extended: ["index"] },
  COUNT_2: { extended: ["index", "middle"] },
  COUNT_3: { extended: ["index", "middle", "ring"] },
  COUNT_4: { extended: FOUR },
  COUNT_5: { extended: ALL, fan: "spread", thumb: "out" },
  SWIPE_RIGHT: { extended: ALL, fan: "together", thumb: "side", rotate: 8, swipe: 1 },
  SWIPE_LEFT: { extended: ALL, fan: "together", thumb: "side", rotate: -8, swipe: -1 },
};

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Three bones from `start`, each pointing in its own direction (degrees, 0 = right, -90 = up). */
function chain(start: Point, dirs: number[], lengths: readonly number[], scale: number[]): Point[] {
  const points: Point[] = [start];
  let [x, y] = start;
  for (let i = 0; i < 3; i++) {
    const length = (lengths[i] ?? 0) * (scale[i] ?? 1);
    x += Math.cos(rad(dirs[i] ?? 0)) * length;
    y += Math.sin(rad(dirs[i] ?? 0)) * length;
    points.push([x, y]);
  }
  return points;
}

function landmarks(def: PoseDef): Point[] {
  const points: Point[] = new Array<Point>(21).fill([0, 0]);
  const thumb = THUMB[def.thumb ?? "folded"];
  chain([-0.27, -0.2], thumb.dirs, [0.33, 0.28, 0.24], thumb.scale).forEach((p, i) => (points[1 + i] = p));
  for (const name of FOUR) {
    const base = FAN[def.fan ?? "normal"][name] ?? -90;
    const knuckle = KNUCKLE[name] ?? [0, 0];
    const lengths = LENGTH[name] ?? [];
    const finger = def.extended.includes(name)
      ? chain(knuckle, [base, base + 2, base + 4], lengths, [1, 1, 1])
      : chain(knuckle, [base, base + 152, base + 205], lengths, [0.55, 0.5, 0.42]);
    finger.forEach((p, i) => (points[FINGER_IDS[name][i] ?? 0] = p));
  }
  if (def.rotate) {
    const cos = Math.cos(rad(def.rotate));
    const sin = Math.sin(rad(def.rotate));
    return points.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos] as const);
  }
  return points;
}

const at = (points: Point[], i: number): Point => points[i] ?? [0, 0];
const pathOf = (points: Point[]) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L")}`;

export function glyphGeometry(pose: GlyphPose): {
  viewBox: string;
  strokeWidth: number;
  shapes: GlyphShape[];
} {
  const def = POSES[pose];
  const p = landmarks(def);
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const pad = 0.2;
  let minX = Math.min(...xs) - pad;
  let maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  if (def.swipe === 1) minX -= 0.75;
  if (def.swipe === -1) maxX += 0.75;
  const width = maxX - minX;
  const height = maxY - minY;
  const side = Math.max(width, height);
  const originX = minX - (side - width) / 2;
  const originY = minY - (side - height) / 2;
  const strokeWidth = round(side * 0.07);
  const shapes: GlyphShape[] = [];

  if (def.swipe) {
    const x0 = def.swipe > 0 ? Math.min(...xs) - 0.1 : Math.max(...xs) + 0.1;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    for (const [dy, length] of [
      [-0.35, 0.45],
      [0, 0.62],
      [0.35, 0.45],
    ] as const) {
      shapes.push({
        kind: "line",
        tone: "motion",
        from: [x0, cy + dy],
        to: [x0 - def.swipe * length, cy + dy],
      });
    }
  }
  // The palm: the wrist widened sideways, so the outline reads as a palm and not a cone.
  const [ix, iy] = at(p, 5);
  const [lx, ly] = at(p, 17);
  const span = Math.hypot(lx - ix, ly - iy) || 1;
  const [wx, wy] = at(p, 0);
  const wristA: Point = [wx - ((lx - ix) / span) * 0.2, wy - ((ly - iy) / span) * 0.2];
  const wristB: Point = [wx + ((lx - ix) / span) * 0.24, wy + ((ly - iy) / span) * 0.24];
  shapes.push({
    kind: "path",
    tone: "bone",
    d: `${pathOf([wristA, at(p, 5), at(p, 9), at(p, 13), at(p, 17), wristB])} Z`,
  });

  for (const name of FOUR) {
    const [knuckle, joint, , tip] = FINGER_IDS[name].map((i) => at(p, i));
    if (!knuckle || !joint || !tip) continue;
    shapes.push(
      def.extended.includes(name)
        ? { kind: "line", tone: "lit", from: knuckle, to: tip }
        : { kind: "line", tone: "bone", from: knuckle, to: joint },
    );
  }
  const [, t1, t2, t3] = FINGER_IDS.thumb.map((i) => at(p, i));
  shapes.push(
    def.extended.includes("thumb")
      ? { kind: "path", tone: "lit", d: pathOf([wristA, t1 ?? wristA, t2 ?? wristA, t3 ?? wristA]) }
      : { kind: "path", tone: "bone", d: pathOf([wristA, t1 ?? wristA, t3 ?? wristA]) },
  );
  for (const name of def.extended) {
    shapes.push({ kind: "dot", at: at(p, FINGER_IDS[name][3] ?? 0), r: round(side * 0.065) });
  }
  return {
    viewBox: `${round(originX)} ${round(originY)} ${round(side)} ${round(side)}`,
    strokeWidth,
    shapes,
  };
}

/** Words for a pose or gesture, as DESIGN.md "Copy" sets them. */
export const GESTURE_LABEL: Record<GlyphPose, string> = {
  NONE: "No pose",
  FIST: "Fist",
  OPEN_PALM: "Open palm",
  THUMBS_UP: "Thumbs up",
  THUMBS_DOWN: "Thumbs down",
  COUNT_1: "One finger",
  COUNT_2: "Two fingers",
  COUNT_3: "Three fingers",
  COUNT_4: "Four fingers",
  COUNT_5: "Five fingers",
  SWIPE_LEFT: "Swipe left",
  SWIPE_RIGHT: "Swipe right",
};
