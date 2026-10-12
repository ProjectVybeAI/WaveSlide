// The settings form's rules, mirroring backend/app/contract/settings.py (ranges, defaults) and the
// rules in backend/app/settings/service.py (one gesture per action, activation must be a held pose).
// The engine checks everything again on save; this file is what lets the form say it first.
import { z } from "zod";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import type { Settings } from "@/api/types";
import type { Action, ProfileId } from "@/components/hand/types";

/** Gestures a mapping can use. COUNT_1 to COUNT_5 are reserved for jumping to a slide. */
export const MAPPABLE_GESTURES = [
  "SWIPE_RIGHT",
  "SWIPE_LEFT",
  "OPEN_PALM",
  "FIST",
  "THUMBS_UP",
  "THUMBS_DOWN",
] as const;
export type MappableGesture = (typeof MAPPABLE_GESTURES)[number];
export const isSwipe = (gesture: MappableGesture) => gesture === "SWIPE_LEFT" || gesture === "SWIPE_RIGHT";

/** In the order the mapping table shows them. */
export const MAPPING_ACTIONS = [
  "next",
  "previous",
  "blank_toggle",
  "toggle_active",
  "start_show",
  "exit_show",
] as const;
export type MappingAction = (typeof MAPPING_ACTIONS)[number] & Action;

export const MAPPING_LABEL: Record<MappingAction, string> = {
  next: "Next slide",
  previous: "Previous slide",
  blank_toggle: "Blank or unblank",
  toggle_active: "Pause or go live",
  start_show: "Start slideshow",
  exit_show: "Exit slideshow",
};

/** What each action does, for "Fist already starts the slideshow". */
const MAPPING_PHRASE: Record<MappingAction, string> = {
  next: "moves to the next slide",
  previous: "goes back a slide",
  blank_toggle: "blanks the screen",
  toggle_active: "pauses and resumes WaveSlide",
  start_show: "starts the slideshow",
  exit_show: "exits the slideshow",
};

export const GESTURE_OPTION_LABEL: Record<MappableGesture, string> = {
  ...GESTURE_LABEL,
  OPEN_PALM: "Open palm, fingers together",
};

const gesture = z.enum(MAPPABLE_GESTURES);
export const PROFILE_IDS = ["powerpoint", "google_slides", "pdf_viewer", "practice"] as const;

export const PROFILE_NAME: Record<ProfileId, string> = {
  powerpoint: "PowerPoint",
  google_slides: "Google Slides",
  pdf_viewer: "PDF viewer",
  practice: "Practice deck",
};

/** A profile's display name; unknown ids (a newer engine) show as they are. */
export function profileName(id: string | undefined): string {
  if (!id) return PROFILE_NAME.powerpoint;
  return (PROFILE_NAME as Record<string, string>)[id] ?? id;
}

export type MappingProblems = Partial<Record<MappingAction, string>>;
type Mappings = Record<MappingAction, MappableGesture>;

/**
 * One gesture can do one thing. The action that already had the gesture in the saved settings keeps it;
 * the other one is flagged with what to do about it. Without a saved baseline the earlier row keeps it.
 */
export function mappingProblems(mappings: Mappings, saved?: Mappings): MappingProblems {
  const problems: MappingProblems = {};
  const used = new Set<MappableGesture>(Object.values(mappings));
  for (const action of MAPPING_ACTIONS) {
    const chosen = mappings[action];
    const sharing = MAPPING_ACTIONS.filter((other) => mappings[other] === chosen);
    if (sharing.length < 2) continue;
    const owner = sharing.find((other) => saved?.[other] === chosen) ?? sharing[0];
    if (owner === undefined || owner === action) continue;
    const free = MAPPABLE_GESTURES.find((candidate) => !used.has(candidate));
    problems[action] =
      `${GESTURE_LABEL[chosen]} already ${MAPPING_PHRASE[owner]}. Choose another gesture here, or give ${MAPPING_LABEL[owner]} a different one first.` +
      (free ? ` ${GESTURE_LABEL[free]} is free.` : "");
  }
  return problems;
}

const hold = z.number().int().min(300).max(3000);

export const settingsSchema = z
  .object({
    schema_version: z.number().int(),
    mappings: z.object({
      next: gesture,
      previous: gesture,
      blank_toggle: gesture,
      toggle_active: gesture,
      start_show: gesture,
      exit_show: gesture,
    }),
    features: z.object({ finger_jump: z.boolean(), blank: z.boolean(), two_hand: z.boolean() }),
    sensitivity: z.object({
      swipe_min_travel: z.number().min(0.5).max(5),
      swipe_max_ms: z.number().int().min(200).max(1500),
      swipe_min_speed: z.number().min(1).max(12),
      palm_spread_max: z.number().min(0.2).max(0.8),
      still_max_speed: z.number().min(0.2).max(3),
      smoothing: z.number().min(0.1).max(5),
    }),
    timing: z.object({
      hold_count_ms: hold,
      hold_palm_ms: hold,
      hold_pose_ms: hold,
      cooldown_ms: z.number().int().min(200).max(3000),
      activation_cooldown_ms: z.number().int().min(200).max(5000),
    }),
    camera: z.object({
      index: z.number().int().min(0).max(9),
      width: z.number().int(),
      height: z.number().int(),
    }),
    profile_id: z.enum(PROFILE_IDS),
    recogniser: z.enum(["rules", "ml"]),
    overlay: z.object({
      visible: z.boolean(),
      compact: z.boolean(),
      show_preview: z.boolean(),
      show_landmarks: z.boolean(),
    }),
    start_paused: z.boolean(),
  })
  .superRefine((values, context) => {
    for (const [action, message] of Object.entries(mappingProblems(values.mappings))) {
      context.addIssue({ code: "custom", path: ["mappings", action], message });
    }
    if (isSwipe(values.mappings.toggle_active)) {
      context.addIssue({
        code: "custom",
        path: ["mappings", "toggle_active"],
        message: "Pausing needs a held pose. Choose a pose such as thumbs up.",
      });
    }
  });

export type SettingsValues = z.infer<typeof settingsSchema>;

/** The §13 defaults, marked on every control. Mirrors the contract's field defaults. */
export const SETTINGS_DEFAULTS: SettingsValues = {
  schema_version: 1,
  mappings: {
    next: "SWIPE_RIGHT",
    previous: "SWIPE_LEFT",
    blank_toggle: "OPEN_PALM",
    toggle_active: "THUMBS_UP",
    start_show: "FIST",
    exit_show: "THUMBS_DOWN",
  },
  features: { finger_jump: true, blank: true, two_hand: false },
  sensitivity: {
    swipe_min_travel: 2.0,
    swipe_max_ms: 500,
    swipe_min_speed: 4.0,
    palm_spread_max: 0.45,
    still_max_speed: 1.0,
    smoothing: 1.0,
  },
  timing: {
    hold_count_ms: 1000,
    hold_palm_ms: 800,
    hold_pose_ms: 1000,
    cooldown_ms: 800,
    activation_cooldown_ms: 1500,
  },
  camera: { index: 0, width: 640, height: 480 },
  profile_id: "powerpoint",
  recogniser: "rules",
  overlay: { visible: true, compact: false, show_preview: true, show_landmarks: true },
  start_paused: true,
};

/** The contract marks every section optional; the engine always sends them. This fills any gap. */
export function toValues(settings: Settings): SettingsValues {
  const d = SETTINGS_DEFAULTS;
  return {
    schema_version: settings.schema_version,
    mappings: { ...d.mappings, ...settings.mappings } as SettingsValues["mappings"],
    features: { ...d.features, ...settings.features },
    sensitivity: { ...d.sensitivity, ...settings.sensitivity },
    timing: { ...d.timing, ...settings.timing },
    camera: { ...d.camera, ...settings.camera },
    profile_id: settings.profile_id,
    recogniser: settings.recogniser,
    overlay: { ...d.overlay, ...settings.overlay },
    start_paused: settings.start_paused,
  };
}

const FIELD_LABEL: Record<string, string> = {
  "mappings.next": "next slide gesture",
  "mappings.previous": "previous slide gesture",
  "mappings.blank_toggle": "blank gesture",
  "mappings.toggle_active": "pause gesture",
  "mappings.start_show": "start slideshow gesture",
  "mappings.exit_show": "exit slideshow gesture",
  "features.finger_jump": "jump with fingers",
  "features.blank": "blank screen",
  "features.two_hand": "two-hand counting",
  "sensitivity.swipe_min_travel": "swipe distance",
  "sensitivity.swipe_max_ms": "swipe time limit",
  "sensitivity.swipe_min_speed": "swipe speed",
  "sensitivity.palm_spread_max": "palm or five fingers",
  "sensitivity.still_max_speed": "keep still for holds",
  "sensitivity.smoothing": "smoothing",
  "timing.hold_count_ms": "hold to jump",
  "timing.hold_palm_ms": "hold to blank",
  "timing.hold_pose_ms": "hold other poses",
  "timing.cooldown_ms": "cooldown",
  "timing.activation_cooldown_ms": "cooldown after pausing",
  "camera.index": "camera",
  profile_id: "app profile",
  recogniser: "recogniser",
  "overlay.visible": "show overlay",
  "overlay.compact": "overlay size",
  "overlay.show_preview": "camera image in overlay",
  "overlay.show_landmarks": "landmarks in overlay",
  start_paused: "start paused",
};

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (typeof value !== "object" || value === null) return { [prefix]: value };
  return Object.entries(value).reduce<Record<string, unknown>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

/** Paths of every field whose value differs from the saved settings. */
export function changedPaths(saved: SettingsValues, draft: SettingsValues): string[] {
  const before = flatten(saved);
  const after = flatten(draft);
  return Object.keys(after).filter((path) => before[path] !== after[path] && path in FIELD_LABEL);
}

/** "Exit slideshow gesture, swipe distance": the save bar's list of what changed. */
export function describeChanges(paths: string[]): string {
  const labels = paths.map((path) => FIELD_LABEL[path] ?? path);
  const shown = labels.slice(0, 3);
  const text = shown.join(", ") + (labels.length > 3 ? ` and ${labels.length - 3} more` : "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
