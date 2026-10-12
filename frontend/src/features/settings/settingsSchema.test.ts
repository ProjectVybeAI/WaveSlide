import examples from "@/mocks/fixtures/examples.json";
import type { Settings } from "@/api/types";
import {
  changedPaths,
  describeChanges,
  mappingProblems,
  SETTINGS_DEFAULTS,
  settingsSchema,
  toValues,
  type SettingsValues,
} from "./settingsSchema";

const saved = SETTINGS_DEFAULTS.mappings;

describe("mapping conflicts", () => {
  it("accepts the defaults: every action has its own gesture", () => {
    expect(mappingProblems(saved)).toEqual({});
  });

  it("flags the action that took a gesture another action already has, and names the owner", () => {
    const problems = mappingProblems({ ...saved, exit_show: "FIST" }, saved);
    expect(Object.keys(problems)).toEqual(["exit_show"]);
    expect(problems.exit_show).toMatch(/Fist already starts the slideshow/);
    expect(problems.exit_show).toMatch(/give Start slideshow a different one first/);
  });

  it("flags the changed row even when it comes earlier in the table", () => {
    // Next slide is set to the fist that Start slideshow already holds: the edited row is the problem.
    const problems = mappingProblems({ ...saved, next: "FIST" }, saved);
    expect(Object.keys(problems)).toEqual(["next"]);
  });

  it("suggests a gesture that is still free", () => {
    const problems = mappingProblems({ ...saved, exit_show: "FIST" }, saved);
    expect(problems.exit_show).toMatch(/Thumbs down is free/);
  });

  it("clears once the conflict is resolved", () => {
    const resolved = { ...saved, exit_show: "FIST" as const, start_show: "THUMBS_DOWN" as const };
    expect(mappingProblems(resolved, saved)).toEqual({});
  });

  it("is part of the schema, so a form that cannot save is also invalid", () => {
    const result = settingsSchema.safeParse({
      ...SETTINGS_DEFAULTS,
      mappings: { ...saved, exit_show: "FIST" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["mappings", "exit_show"]);
  });

  it("rejects a swipe for pausing: it has to be a held pose", () => {
    const result = settingsSchema.safeParse({
      ...SETTINGS_DEFAULTS,
      mappings: { ...saved, toggle_active: "SWIPE_LEFT", previous: "FIST", start_show: "THUMBS_UP" },
    });
    expect(result.error?.issues.some((issue) => issue.message.includes("held pose"))).toBe(true);
  });
});

describe("settings values", () => {
  it("the engine's example settings are valid and equal the §13 defaults", () => {
    const values = toValues(examples.settings as Settings);
    expect(settingsSchema.safeParse(values).success).toBe(true);
    expect(values).toEqual(SETTINGS_DEFAULTS);
  });

  it("holds numbers to the contract's ranges", () => {
    const tooLow: SettingsValues = {
      ...SETTINGS_DEFAULTS,
      sensitivity: { ...SETTINGS_DEFAULTS.sensitivity, swipe_min_travel: 0.2 },
    };
    expect(settingsSchema.safeParse(tooLow).success).toBe(false);
    const tooLong: SettingsValues = {
      ...SETTINGS_DEFAULTS,
      timing: { ...SETTINGS_DEFAULTS.timing, hold_count_ms: 4000 },
    };
    expect(settingsSchema.safeParse(tooLong).success).toBe(false);
  });

  it("lists what changed in words, in table order", () => {
    const draft: SettingsValues = {
      ...SETTINGS_DEFAULTS,
      mappings: { ...saved, exit_show: "FIST" },
      sensitivity: { ...SETTINGS_DEFAULTS.sensitivity, swipe_min_travel: 2.2 },
    };
    const paths = changedPaths(SETTINGS_DEFAULTS, draft);
    expect(paths).toEqual(["mappings.exit_show", "sensitivity.swipe_min_travel"]);
    expect(describeChanges(paths)).toBe("Exit slideshow gesture, swipe distance");
  });
});
