// Gestures: one select per action. Two actions on one gesture is shown inline, before saving, with
// the fix in words. A swipe cannot pause WaveSlide (it must be held), so those options are off there.
import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { Select, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { FieldContext } from "@/components/ui/fieldContext";
import type { AppProfile } from "@/api/types";
import { useDraft } from "./draft";
import {
  GESTURE_OPTION_LABEL,
  isSwipe,
  MAPPABLE_GESTURES,
  MAPPING_ACTIONS,
  MAPPING_LABEL,
  mappingProblems,
  type MappableGesture,
  type MappingAction,
} from "./settingsSchema";
import { SetSection } from "./SetSection";
import styles from "./MappingSection.module.css";

type Props = {
  profile: AppProfile | undefined;
  /** An error the engine returned for one action (ACTIVATION_MUST_BE_HELD_POSE). */
  serverError: { action: MappingAction; message: string } | null;
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function MappingSection({ profile, serverError }: Props) {
  const { values, saved, changed, set } = useDraft();
  const problems = mappingProblems(values.mappings, saved.mappings);

  const fires = (gesture: MappableGesture) => {
    if (isSwipe(gesture)) return "As the swipe happens";
    const ms = gesture === "OPEN_PALM" ? values.timing.hold_palm_ms : values.timing.hold_pose_ms;
    return `After a ${seconds(ms)} hold`;
  };

  return (
    <SetSection
      title="Gestures"
      description="Which gesture does what. Each gesture can do one thing. Holding up one to five fingers is kept for jumping to a slide."
    >
      <Table caption="Gesture for each action" captionHidden>
        <THead>
          <Tr className={styles.head}>
            <Th>Action</Th>
            <Th>Gesture</Th>
            <Th>Fires</Th>
          </Tr>
        </THead>
        <TBody>
          {MAPPING_ACTIONS.map((action) => (
            <Row
              key={action}
              action={action}
              gesture={values.mappings[action]}
              changed={changed.has(`mappings.${action}`)}
              problem={problems[action] ?? (serverError?.action === action ? serverError.message : undefined)}
              unsupported={profile?.unsupported.includes(action) ? profile.name : undefined}
              fires={fires(values.mappings[action])}
              onChange={(gesture) => set(`mappings.${action}`, gesture)}
            />
          ))}
          <Tr>
            <Td>Jump to slide 1 to 5</Td>
            <Td>
              <span className={styles.glyphs}>
                <PoseGlyph pose="COUNT_1" size={24} />
                <PoseGlyph pose="COUNT_3" size={24} />
                <PoseGlyph pose="COUNT_5" size={24} />
                <span className={styles.muted}>One to five fingers, kept for jumping</span>
              </span>
            </Td>
            <Td className={styles.muted}>After a {seconds(values.timing.hold_count_ms)} hold</Td>
          </Tr>
        </TBody>
      </Table>
    </SetSection>
  );
}

type RowProps = {
  action: MappingAction;
  gesture: MappableGesture;
  changed: boolean;
  problem: string | undefined;
  unsupported: string | undefined;
  fires: string;
  onChange: (gesture: MappableGesture) => void;
};

function Row({ action, gesture, changed, problem, unsupported, fires, onChange }: RowProps) {
  const id = useId();
  const errorId = problem ? `${id}-error` : undefined;
  const label = MAPPING_LABEL[action];
  return (
    <>
      <Tr className={changed ? styles.changed : undefined}>
        <Td>
          {label}
          {changed ? <span className={styles.tag}>Changed</span> : null}
        </Td>
        <Td>
          <span className={styles.gesture}>
            <PoseGlyph pose={gesture} size={24} />
            <FieldContext.Provider
              value={{
                controlId: `${id}-select`,
                helpId: undefined,
                errorId,
                invalid: Boolean(problem),
                required: false,
              }}
            >
              <Select
                aria-label={`Gesture for ${label}`}
                value={gesture}
                onValueChange={(next) => onChange(next as MappableGesture)}
                className={styles.select}
                options={MAPPABLE_GESTURES.map((option) => ({
                  value: option,
                  label: GESTURE_OPTION_LABEL[option],
                  // Pausing has to be held: a swipe is over before it could be confirmed.
                  disabled: action === "toggle_active" && isSwipe(option),
                }))}
              />
            </FieldContext.Provider>
          </span>
        </Td>
        <Td className={styles.muted}>{fires}</Td>
      </Tr>
      {problem ? (
        <Tr className={styles.noteRow}>
          <Td />
          <Td colSpan={2}>
            <p className={styles.error} id={errorId} role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>{problem}</span>
            </p>
          </Td>
        </Tr>
      ) : null}
      {unsupported ? (
        <Tr className={styles.noteRow}>
          <Td />
          <Td colSpan={2}>
            <p className={styles.note}>
              {unsupported} has no key for this, so the gesture does nothing there.
            </p>
          </Td>
        </Tr>
      ) : null}
    </>
  );
}
