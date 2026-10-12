// Sensitivity and Timing: faders with units, the default marked, and (for timing) a dial preview
// that redraws its ticks as the hold changes: one tick per 100 ms.
import { HoldRing } from "@/components/hand/HoldRing";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { useDraft } from "./draft";
import { SETTINGS_DEFAULTS } from "./settingsSchema";
import { SetSection } from "./SetSection";
import { Slider } from "./Slider";
import styles from "./TuningSections.module.css";

const wholeNumber = (value: number) => value.toFixed(0);
const twoDecimals = (value: number) => value.toFixed(2);

export function SensitivitySection() {
  const { values, changed, set } = useDraft();
  const s = values.sensitivity;
  const d = SETTINGS_DEFAULTS.sensitivity;
  const common = (key: keyof typeof s) => ({
    changed: changed.has(`sensitivity.${key}`),
    defaultValue: d[key],
  });
  return (
    <SetSection
      title="Sensitivity"
      description="Distances are in hand lengths: wrist to the middle knuckle. A swipe of 2 hand lengths is the same gesture at 0.5 m and at 2 m."
      aside={
        <div className={styles.unit}>
          <PoseGlyph pose="OPEN_PALM" size={56} />
          <p>1 hand length = wrist to the middle knuckle, measured every frame</p>
        </div>
      }
      columns={2}
    >
      <Slider
        label="Swipe distance"
        {...common("swipe_min_travel")}
        value={s.swipe_min_travel}
        onValueChange={(v) => set("sensitivity.swipe_min_travel", v)}
        min={0.5}
        max={5}
        step={0.1}
        unit="hand lengths"
        help="How far the palm travels sideways for a swipe."
      />
      <Slider
        label="Swipe time limit"
        {...common("swipe_max_ms")}
        value={s.swipe_max_ms}
        onValueChange={(v) => set("sensitivity.swipe_max_ms", v)}
        min={200}
        max={1500}
        step={50}
        unit="ms"
        format={wholeNumber}
        help="The travel has to happen within this time."
      />
      <Slider
        label="Swipe speed"
        {...common("swipe_min_speed")}
        value={s.swipe_min_speed}
        onValueChange={(v) => set("sensitivity.swipe_min_speed", v)}
        min={1}
        max={12}
        step={0.5}
        unit="hand lengths/s"
        help="Peak speed. Drifting while you talk stays below it."
      />
      <Slider
        label="Keep still for holds"
        {...common("still_max_speed")}
        value={s.still_max_speed}
        onValueChange={(v) => set("sensitivity.still_max_speed", v)}
        min={0.2}
        max={3}
        step={0.1}
        unit="hand lengths/s"
        help="A held gesture only fills the dial while the palm is slower than this."
      />
      <Slider
        label="Palm or five fingers"
        {...common("palm_spread_max")}
        value={s.palm_spread_max}
        onValueChange={(v) => set("sensitivity.palm_spread_max", v)}
        min={0.2}
        max={0.8}
        step={0.01}
        unit="spread"
        format={twoDecimals}
        help="Fingers closer than this are an open palm; wider apart is five."
      />
      <Slider
        label="Smoothing"
        {...common("smoothing")}
        value={s.smoothing}
        onValueChange={(v) => set("sensitivity.smoothing", v)}
        min={0.1}
        max={5}
        step={0.1}
        unit="Hz cut-off"
        help="Lower is steadier, higher reacts faster."
      />
    </SetSection>
  );
}

const seconds = (ms: number) => ms / 1000;

export function TimingSection() {
  const { values, changed, set } = useDraft();
  const t = values.timing;
  const d = SETTINGS_DEFAULTS.timing;
  return (
    <SetSection
      title="Timing"
      description="Held gestures fill the dial before they fire, one tick per 100 ms, so there is time to change your mind. Cooldowns stop one gesture from firing twice."
    >
      <Slider
        label="Hold to jump to a slide"
        value={seconds(t.hold_count_ms)}
        defaultValue={seconds(d.hold_count_ms)}
        changed={changed.has("timing.hold_count_ms")}
        onValueChange={(v) => set("timing.hold_count_ms", Math.round(v * 1000))}
        min={0.3}
        max={3}
        step={0.1}
        unit="s"
        help={`${t.hold_count_ms / 100} ticks. Long enough to see the number and let go if it is wrong.`}
        leading={
          <HoldRing
            state="idle"
            holdMs={t.hold_count_ms}
            label="3"
            size={64}
            description={`Preview: ${t.hold_count_ms / 100} ticks`}
          />
        }
      />
      <Slider
        label="Hold to blank"
        value={seconds(t.hold_palm_ms)}
        defaultValue={seconds(d.hold_palm_ms)}
        changed={changed.has("timing.hold_palm_ms")}
        onValueChange={(v) => set("timing.hold_palm_ms", Math.round(v * 1000))}
        min={0.3}
        max={3}
        step={0.1}
        unit="s"
        help={`${t.hold_palm_ms / 100} ticks.`}
        leading={
          <HoldRing
            state="idle"
            holdMs={t.hold_palm_ms}
            label="B"
            size={64}
            description={`Preview: ${t.hold_palm_ms / 100} ticks`}
          />
        }
      />
      <Slider
        label="Hold other poses"
        value={seconds(t.hold_pose_ms)}
        defaultValue={seconds(d.hold_pose_ms)}
        changed={changed.has("timing.hold_pose_ms")}
        onValueChange={(v) => set("timing.hold_pose_ms", Math.round(v * 1000))}
        min={0.3}
        max={3}
        step={0.1}
        unit="s"
        help="Pause or go live, start and exit the slideshow."
        leading={
          <HoldRing
            state="idle"
            holdMs={t.hold_pose_ms}
            size={64}
            description={`Preview: ${t.hold_pose_ms / 100} ticks`}
          />
        }
      />
      <Slider
        label="Cooldown after a command"
        value={t.cooldown_ms}
        defaultValue={d.cooldown_ms}
        changed={changed.has("timing.cooldown_ms")}
        onValueChange={(v) => set("timing.cooldown_ms", v)}
        min={200}
        max={3000}
        step={50}
        unit="ms"
        format={wholeNumber}
        help="Then the same pose has to be released before it can fire again."
        leading={
          <HoldRing state="cooldown" cooldown={1} holdMs={0} size={64} description="Preview: cooldown arc" />
        }
      />
      <Slider
        label="Cooldown after going live or pausing"
        value={t.activation_cooldown_ms}
        defaultValue={d.activation_cooldown_ms}
        changed={changed.has("timing.activation_cooldown_ms")}
        onValueChange={(v) => set("timing.activation_cooldown_ms", v)}
        min={200}
        max={5000}
        step={100}
        unit="ms"
        format={wholeNumber}
        help="Longer than the others, so one thumbs up cannot switch you live and straight back."
        leading={
          <HoldRing state="cooldown" cooldown={1} holdMs={0} size={64} description="Preview: cooldown arc" />
        }
      />
    </SetSection>
  );
}
