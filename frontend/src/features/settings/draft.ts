// The settings form as every section sees it: the draft values, what was saved, which fields
// changed, and one `set`. Sections read this instead of passing props through the page.
import { createContext, useContext } from "react";
import type { Path, PathValue } from "react-hook-form";
import type { SettingsValues } from "./settingsSchema";

export type Draft = {
  values: SettingsValues;
  saved: SettingsValues;
  /** Paths (like "sensitivity.swipe_min_travel") whose draft value differs from the saved one. */
  changed: ReadonlySet<string>;
  set: <P extends Path<SettingsValues>>(path: P, value: PathValue<SettingsValues, P>) => void;
};

export const DraftContext = createContext<Draft | null>(null);

export function useDraft(): Draft {
  const draft = useContext(DraftContext);
  if (!draft) throw new Error("useDraft must be used inside the settings form");
  return draft;
}
