// A full synthetic evaluation report (and the same numbers as a recorded run): every section filled, so each part of the Evaluation lab can be
// drawn and tested. Numbers follow design/prototype/evaluation.html. Used by the MSW handlers
// (the default fixture) and by the component tests; never by the real app.
import type { EvaluationReport, EvaluationSummary } from "@/api/types";

const POSES = [
  "NONE",
  "FIST",
  "OPEN_PALM",
  "THUMBS_UP",
  "THUMBS_DOWN",
  "COUNT_1",
  "COUNT_2",
  "COUNT_3",
  "COUNT_4",
  "COUNT_5",
];

// Counts per 400 frames of each held pose. Four against five and five against an open palm are the slips.
const RULES = [
  [372, 6, 4, 3, 1, 5, 3, 2, 2, 2],
  [8, 381, 0, 6, 3, 2, 0, 0, 0, 0],
  [6, 0, 352, 0, 0, 0, 0, 2, 9, 31],
  [9, 7, 0, 378, 0, 6, 0, 0, 0, 0],
  [11, 6, 0, 0, 381, 2, 0, 0, 0, 0],
  [7, 3, 0, 4, 0, 376, 9, 1, 0, 0],
  [6, 0, 0, 0, 0, 6, 371, 15, 2, 0],
  [5, 0, 1, 0, 0, 0, 12, 362, 19, 1],
  [4, 0, 6, 0, 0, 0, 1, 14, 339, 36],
  [3, 0, 27, 0, 0, 0, 0, 1, 33, 336],
];
const MODEL = [
  [366, 5, 4, 4, 3, 6, 4, 3, 3, 2],
  [6, 386, 0, 4, 2, 2, 0, 0, 0, 0],
  [4, 0, 377, 0, 0, 0, 0, 1, 4, 14],
  [7, 5, 0, 383, 0, 5, 0, 0, 0, 0],
  [10, 9, 0, 0, 376, 5, 0, 0, 0, 0],
  [6, 2, 0, 3, 0, 381, 7, 1, 0, 0],
  [5, 0, 0, 0, 0, 5, 378, 11, 1, 0],
  [4, 0, 0, 0, 0, 0, 9, 372, 14, 1],
  [3, 0, 3, 0, 0, 0, 1, 10, 361, 22],
  [2, 0, 12, 0, 0, 0, 0, 1, 20, 365],
];

const FINGERS = [
  [34, 0, 0, 0, 0],
  [1, 32, 1, 0, 0],
  [0, 1, 31, 2, 0],
  [0, 0, 2, 30, 2],
  [0, 0, 0, 3, 31],
];
const TWO_HANDS = [
  [8, 1, 0, 0, 0],
  [0, 9, 0, 0, 0],
  [0, 0, 7, 1, 0],
  [0, 0, 1, 8, 0],
  [0, 0, 0, 0, 9],
];

const tally = (correct: number, total: number) => ({ correct, total });
const gestureRow = (gesture: string, action: string, counts: number[], per: number) => {
  const correct = counts.reduce((sum, n) => sum + n, 0);
  return {
    gesture,
    action,
    per_participant: Object.fromEntries(counts.map((n, i) => [`p${i + 1}`, tally(n, per)])),
    correct,
    total: per * counts.length,
    accuracy: correct / (per * counts.length),
  };
};

export const fullReport: EvaluationReport = {
  id: "2026-10-12-1420",
  created_at: "2026-10-12T14:20:00+00:00",
  synthetic: true,
  sources: ["synthetic"],
  n_sessions: 12,
  participants: ["p1", "p2", "p3"],
  charts: [],
  sections: {
    e1_gestures: {
      rows: [
        gestureRow("SWIPE_RIGHT", "next", [30, 29, 30], 30),
        gestureRow("SWIPE_LEFT", "previous", [29, 30, 28], 30),
        gestureRow("OPEN_PALM", "blank_toggle", [12, 11, 12], 12),
        gestureRow("THUMBS_UP", "toggle_active", [12, 12, 12], 12),
        gestureRow("FIST", "start_show", [12, 12, 11], 12),
        gestureRow("THUMBS_DOWN", "exit_show", [11, 12, 12], 12),
        gestureRow("COUNT_3", "jump", [57, 56, 55], 60),
      ],
    },
    e2_finger_count: {
      one_hand: { labels: ["1", "2", "3", "4", "5"], matrix: FINGERS },
      two_hand: { labels: ["6", "7", "8", "9", "10"], matrix: TWO_HANDS },
      accuracy: 0.933,
    },
    e3_false_triggers: {
      minutes: 9,
      active_per_min: 0.33,
      paused_per_min: 0,
      per_participant: { p1: 0.33, p2: 0.67, p3: 0 },
    },
    e4_response_time: {
      n_commands: 1284,
      pipeline_p50_ms: 23,
      pipeline_p95_ms: 38,
      histogram: [
        [12, 16, 41],
        [16, 20, 188],
        [20, 24, 402],
        [24, 28, 318],
        [28, 32, 162],
        [32, 36, 88],
        [36, 40, 47],
        [40, 44, 22],
        [44, 48, 11],
        [48, 52, 5],
      ].map(([start_ms, end_ms, count]) => ({ start_ms: start_ms!, end_ms: end_ms!, count: count! })),
      gesture_end_to_command_p50_ms: 41,
      key_to_render_p50_ms: 31,
    },
    e5_distance: {
      rows: [
        {
          condition: "0.5 m",
          rules_accuracy: 0.97,
          ml_accuracy: 0.98,
          detection_rate: 1,
          luminance_mean: null,
        },
        {
          condition: "1 m",
          rules_accuracy: 0.96,
          ml_accuracy: 0.97,
          detection_rate: 1,
          luminance_mean: null,
        },
        {
          condition: "1.5 m",
          rules_accuracy: 0.92,
          ml_accuracy: 0.95,
          detection_rate: 0.98,
          luminance_mean: null,
        },
        {
          condition: "2 m",
          rules_accuracy: 0.76,
          ml_accuracy: 0.81,
          detection_rate: 0.86,
          luminance_mean: null,
        },
      ],
    },
    e6_lighting: {
      rows: [
        {
          condition: "bright",
          rules_accuracy: 0.96,
          ml_accuracy: 0.97,
          detection_rate: 1,
          luminance_mean: 168,
        },
        {
          condition: "normal",
          rules_accuracy: 0.96,
          ml_accuracy: 0.97,
          detection_rate: 1,
          luminance_mean: 121,
        },
        {
          condition: "dim",
          rules_accuracy: 0.87,
          ml_accuracy: 0.91,
          detection_rate: 0.93,
          luminance_mean: 54,
        },
      ],
    },
    e7_rules_vs_model: {
      rules: { confusion: { labels: POSES, matrix: RULES }, macro_f1: macroF1(RULES), ms_per_frame: 0.02 },
      ml: { confusion: { labels: POSES, matrix: MODEL }, macro_f1: macroF1(MODEL), ms_per_frame: 0.41 },
    },
    // A synthetic run has no study participants, so no ratings (the screen says so).
    e8_ratings: null,
    ablation: {
      minutes: 9,
      rows: [
        { control: "all_on", false_triggers_per_min: 0.33 },
        { control: "no_hold", false_triggers_per_min: 4.7 },
        { control: "no_cooldown", false_triggers_per_min: 2.3 },
        { control: "no_stillness", false_triggers_per_min: 1.7 },
        { control: "no_rearm", false_triggers_per_min: 1.3 },
      ],
    },
  },
};

/** A run on recorded sessions: the same numbers without the banner, and with the participants' ratings. */
export const recordedReport: EvaluationReport = {
  ...fullReport,
  id: "2026-10-12-1630",
  created_at: "2026-10-12T16:30:00+00:00",
  synthetic: false,
  sources: ["recorded"],
  sections: {
    ...fullReport.sections,
    e8_ratings: {
      rows: [
        { participant: "p1", ease: 5, reliability: 4, comment: "Swipes felt natural." },
        {
          participant: "p2",
          ease: 4,
          reliability: 4,
          comment: "Holding up fingers for a full second felt long at first.",
        },
        { participant: "p3", ease: 5, reliability: 3, comment: "" },
      ],
      ease_mean: 4.67,
      reliability_mean: 3.67,
    },
  },
};

/** The same run without a trained model: the right-hand half of E7 and the model lines are missing. */
function withoutModel(report: EvaluationReport, id: string, createdAt: string): EvaluationReport {
  return {
    ...report,
    id,
    created_at: createdAt,
    sections: {
      ...report.sections,
      e5_distance: {
        rows: (report.sections.e5_distance?.rows ?? []).map((row) => ({ ...row, ml_accuracy: null })),
      },
      e6_lighting: {
        rows: (report.sections.e6_lighting?.rows ?? []).map((row) => ({ ...row, ml_accuracy: null })),
      },
      e7_rules_vs_model: { rules: report.sections.e7_rules_vs_model!.rules, ml: null },
      e8_ratings: null,
    },
  };
}

export const reportWithoutModel = withoutModel(fullReport, "2026-10-11-0900", "2026-10-11T09:00:00+00:00");
const recordedWithoutModel = withoutModel(recordedReport, "2026-10-11-0930", "2026-10-11T09:30:00+00:00");

const summarise = ({
  id,
  created_at,
  synthetic,
  sources,
  n_sessions,
  participants,
}: EvaluationReport): EvaluationSummary => ({
  id,
  created_at,
  synthetic,
  sources,
  n_sessions,
  participants,
});

/** Every report the mocks can serve. */
export const allReports = [fullReport, reportWithoutModel, recordedReport, recordedWithoutModel];

/** The runs listed in the `synthetic-data` state (the Dataset mocks also use these). */
export const summaries: EvaluationSummary[] = [fullReport, reportWithoutModel].map(summarise);

/** The runs listed in the `default` state: a run on recorded sessions, newest first. */
export const recordedSummaries: EvaluationSummary[] = [recordedReport, recordedWithoutModel].map(summarise);

/** Macro-averaged F1 over the classes of a count matrix (rows: shown, columns: recognised), 2 decimals. */
function macroF1(matrix: number[][]): number {
  const scores = matrix.map((row, i) => {
    const truePositive = row[i] ?? 0;
    const falseNegative = row.reduce((sum, n) => sum + n, 0) - truePositive;
    const falsePositive = matrix.reduce((sum, other) => sum + (other[i] ?? 0), 0) - truePositive;
    return (2 * truePositive) / (2 * truePositive + falsePositive + falseNegative);
  });
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100;
}
