// What the Evaluation lab works out from a report: the words for poses and controls, the five
// headline figures, the distance the rules stay reliable to, and the commonest confusion.
// Pure functions, so each can be checked without drawing anything.
import type { EvaluationReport } from "@/api/types";
import { figure, percentExact, type AxisLabel, type Figure } from "@/components/charts";
import { GESTURE_LABEL, type GlyphPose } from "@/components/hand/glyph";
import { rowTotal } from "@/components/charts/heat";

type Sections = EvaluationReport["sections"];

export const SECTION_LINKS = [
  { id: "e1", label: "E1 Gestures" },
  { id: "e2", label: "E2 Jumps" },
  { id: "e3", label: "E3 False triggers" },
  { id: "e4", label: "E4 Response" },
  { id: "e5", label: "E5 Distance" },
  { id: "e6", label: "E6 Lighting" },
  { id: "e7", label: "E7 Rules vs model" },
  { id: "e8", label: "E8 Ratings" },
  { id: "ablation", label: "Ablation" },
] as const;

export const CONTROL_LABEL = {
  all_on: "All controls on",
  no_hold: "No hold to confirm",
  no_cooldown: "No cooldown",
  no_stillness: "No stillness check",
  no_rearm: "No re-arm after firing",
} as const;

export const isPose = (label: string): label is GlyphPose => label in GESTURE_LABEL;

const SHORT: Partial<Record<GlyphPose, string>> = {
  NONE: "None",
  FIST: "Fist",
  OPEN_PALM: "Palm",
  THUMBS_UP: "Up",
  THUMBS_DOWN: "Down",
  COUNT_1: "1",
  COUNT_2: "2",
  COUNT_3: "3",
  COUNT_4: "4",
  COUNT_5: "5",
};

/** A confusion-matrix axis entry for a contract class name: a short word, a full name and its glyph. */
export function poseAxis(label: string): AxisLabel {
  if (!isPose(label)) return { short: label, name: label };
  return { short: SHORT[label] ?? GESTURE_LABEL[label], name: GESTURE_LABEL[label], pose: label };
}

/** The finger-count matrices are labelled "1" to "5" (or "6" to "10"): jumps, not poses. */
export const jumpAxis = (label: string): AxisLabel => ({ short: label, name: `${label} fingers` });

/** A gesture as the table says it: "Swipe right", or a sentence-cased fallback for a new one. */
export function gestureName(gesture: string): string {
  if (isPose(gesture)) return GESTURE_LABEL[gesture];
  const words = gesture.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "Next slide" for "next"; unknown actions are sentence-cased. */
export function actionName(action: string): string {
  const known: Record<string, string> = {
    next: "Next slide",
    previous: "Previous slide",
    blank_toggle: "Blank or unblank",
    toggle_active: "Pause or go live",
    start_show: "Start slideshow",
    exit_show: "Exit slideshow",
    jump: "Jump to slide",
  };
  return known[action] ?? gestureName(action);
}

/** The furthest distance, in metres, up to which the rules stay at 90% or better; null if never. */
export function reliableRange(rows: Array<{ condition: string; rules_accuracy: number }>): number | null {
  const byDistance = rows
    .map((row) => ({ metres: Number.parseFloat(row.condition), accuracy: row.rules_accuracy }))
    .filter((row) => Number.isFinite(row.metres))
    .sort((a, b) => a.metres - b.metres);
  let reliable: number | null = null;
  for (const row of byDistance) {
    if (row.accuracy < 0.9) break;
    reliable = row.metres;
  }
  return reliable;
}

const NONE = "–";

/** The strip under the banner: five numbers an examiner can read first. */
export function headlineFigures(sections: Sections): Figure[] {
  const rules = sections.e7_rules_vs_model?.rules;
  const model = sections.e7_rules_vs_model?.ml;
  const triggers = sections.e3_false_triggers;
  const range = sections.e5_distance ? reliableRange(sections.e5_distance.rows) : null;
  return [
    {
      value: rules ? rules.macro_f1.toFixed(2) : NONE,
      label: rules
        ? `Rules, macro-F1 over ${rules.confusion.labels.length} poses`
        : "Rules, macro-F1 (not run)",
    },
    {
      value: model ? model.macro_f1.toFixed(2) : NONE,
      label: model
        ? "Trained model, macro-F1, leave one participant out"
        : "Trained model (none in this run)",
    },
    {
      value: triggers ? figure(triggers.active_per_min) : NONE,
      unit: triggers ? "/min" : undefined,
      label: triggers
        ? `False triggers per minute of talking while live; ${figure(triggers.paused_per_min)} while paused`
        : "False triggers (no talking session)",
    },
    {
      value: sections.e4_response_time ? figure(sections.e4_response_time.pipeline_p95_ms) : NONE,
      unit: sections.e4_response_time ? "ms" : undefined,
      label: "Capture to key, 95th percentile",
    },
    {
      value: range === null ? NONE : figure(range),
      unit: range === null ? undefined : "m",
      label:
        range === null ? "Reliable range (rules never reach 90%)" : "Reliable range, rules at 90% or better",
    },
  ];
}

export type Confusion = { shown: string; read: string; count: number; total: number };

/** The most common wrong answer in a matrix: what was shown, what it was read as, and how often. */
export function topConfusion(labels: string[], matrix: number[][]): Confusion | null {
  let best: Confusion | null = null;
  for (const [shown, row] of matrix.entries()) {
    for (const [read, count] of row.entries()) {
      if (shown === read || count === 0) continue;
      if (best === null || count > best.count) {
        best = { shown: labels[shown] ?? "", read: labels[read] ?? "", count, total: rowTotal(row) };
      }
    }
  }
  return best;
}

/** "The commonest slip: four fingers read as five fingers (36 of 400 frames, 9%)." */
export function confusionSentence(labels: string[], matrix: number[][]): string | null {
  const slip = topConfusion(labels, matrix);
  if (!slip) return null;
  const name = (label: string) => poseAxis(label).name.toLowerCase();
  return `The commonest slip: ${name(slip.shown)} read as ${name(slip.read)} (${slip.count} of ${slip.total} frames, ${percentExact(slip.count / slip.total)}).`;
}
