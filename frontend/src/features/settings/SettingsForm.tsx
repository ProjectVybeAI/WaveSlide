// The settings form: react-hook-form holds the draft, zod checks it, and the engine has the last word.
// Edits stay in the draft until Save; conflicts show inline before saving; a failed save keeps
// everything typed; leaving with unsaved changes asks first.
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Path, type PathValue } from "react-hook-form";
import { useBlocker } from "react-router";
import { ApiError, toMessage } from "@/api/errors";
import type { AppProfile, CameraInfo, Health, ModelCard } from "@/api/types";
import { ConfirmDialog } from "@/components/ui";
import { DraftContext, type Draft } from "./draft";
import { useSaveSettings } from "./api";
import { CameraAppSection, RecogniserSection } from "./DeviceSections";
import { MappingSection } from "./MappingSection";
import { SaveBar } from "./SaveBar";
import {
  changedPaths,
  describeChanges,
  isSwipe,
  mappingProblems,
  settingsSchema,
  toValues,
  type SettingsValues,
} from "./settingsSchema";
import { OverlaySection, FeaturesSection } from "./ToggleSections";
import { SensitivitySection, TimingSection } from "./TuningSections";
import styles from "./SettingsForm.module.css";

type Props = {
  /** The saved settings. */
  baseline: SettingsValues;
  profiles: UseQueryResult<AppProfile[]>;
  cameras: UseQueryResult<CameraInfo[]>;
  model: UseQueryResult<ModelCard | null>;
  health: Health | undefined;
};

const SAVED_FLASH_MS = 5000;

export function SettingsForm({ baseline, profiles, cameras, model, health }: Props) {
  const save = useSaveSettings();
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: baseline,
    mode: "onChange",
  });
  const values = useWatch({ control: form.control }) as SettingsValues;
  const [failure, setFailure] = useState<ApiError | Error | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const changed = useMemo(() => changedPaths(baseline, values), [baseline, values]);
  const dirty = changed.length > 0;

  // A change that arrives from elsewhere (an import, the other window) replaces the form unless it holds edits.
  useEffect(() => {
    if (!dirty) form.reset(baseline);
    // `dirty` is read when the saved settings change, not the other way round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline]);

  const set = useCallback<Draft["set"]>(
    <P extends Path<SettingsValues>>(path: P, value: PathValue<SettingsValues, P>) => {
      setFailure(null);
      setJustSaved(false);
      form.setValue(path, value, { shouldDirty: true, shouldValidate: true });
    },
    [form],
  );
  const draft = useMemo<Draft>(
    () => ({ values, saved: baseline, changed: new Set(changed), set }),
    [values, baseline, changed, set],
  );

  const problems = mappingProblems(values.mappings, baseline.mappings);
  const blockedReason = Object.keys(problems).length
    ? "Fix the gesture conflict to save."
    : isSwipe(values.mappings.toggle_active)
      ? "Choose a held pose for pausing to save."
      : !settingsSchema.safeParse(values).success
        ? "Fix the highlighted values to save."
        : null;

  const onSave = async () => {
    // The same schema the form validates with; the engine checks it again.
    const checked = settingsSchema.safeParse(values);
    if (!checked.success) return;
    setFailure(null);
    try {
      const saved = await save.mutateAsync(checked.data);
      form.reset(toValues(saved));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
    } catch (error) {
      setFailure(error instanceof Error ? error : new Error(toMessage(error)));
    }
  };

  const discard = () => {
    form.reset(baseline);
    setFailure(null);
  };

  // Leaving with unsaved changes: ask first. (Closing the window is the browser's own prompt.)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const code = failure instanceof ApiError ? failure.code : null;
  const profile = profiles.data?.find((item) => item.id === values.profile_id);

  return (
    <DraftContext.Provider value={draft}>
      {/* A plain group, not a <form>: Radix adds hidden inputs to controls inside a form, and Save is one explicit button. */}
      <div className={styles.form} role="group" aria-label="Settings">
        <div className={styles.sections}>
          <MappingSection
            profile={profile}
            serverError={
              code === "ACTIVATION_MUST_BE_HELD_POSE" && failure
                ? { action: "toggle_active", message: failure.message }
                : null
            }
          />
          <FeaturesSection profile={profile} />
          <SensitivitySection />
          <TimingSection />
          <CameraAppSection cameras={cameras} profiles={profiles} health={health} />
          <RecogniserSection
            model={model}
            serverError={code === "NO_MODEL" && failure ? failure.message : null}
          />
          <OverlaySection />
        </div>
        <SaveBar
          changeCount={changed.length}
          changeSummary={describeChanges(changed)}
          blockedReason={blockedReason}
          saving={save.isPending}
          error={
            failure && code !== "ACTIVATION_MUST_BE_HELD_POSE" && code !== "NO_MODEL"
              ? `Not saved. ${failure.message}`
              : null
          }
          saved={justSaved}
          onSave={() => void onSave()}
          onDiscard={discard}
        />
      </div>
      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Leave without saving?"
        tone="primary"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => blocker.proceed?.()}
      >
        You changed {describeChanges(changed).toLowerCase()}. Leaving this page discards{" "}
        {changed.length === 1 ? "it" : "them"}.
      </ConfirmDialog>
    </DraftContext.Provider>
  );
}
