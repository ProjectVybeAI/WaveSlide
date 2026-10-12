// Features and Overlay: switches that take effect when saved (Save is the one commit point).
import { Switch } from "@/components/ui";
import type { AppProfile } from "@/api/types";
import { useDraft } from "./draft";
import { Segmented } from "./Segmented";
import { SetSection } from "./SetSection";
import styles from "./ToggleSections.module.css";

function Changed({ show }: { show: boolean }) {
  return show ? <span className={styles.tag}>Changed</span> : null;
}

export function FeaturesSection({ profile }: { profile: AppProfile | undefined }) {
  const { values, changed, set } = useDraft();
  const noBlank = profile?.unsupported.includes("blank_toggle");
  return (
    <SetSection
      title="Features"
      description="Turn off what you do not use; fewer gestures means fewer surprises."
    >
      <div className={styles.list}>
        <Switch
          label={
            <>
              Jump to a slide with fingers <Changed show={changed.has("features.finger_jump")} />
            </>
          }
          description="Hold up one to five fingers to go straight to that slide."
          checked={values.features.finger_jump}
          onCheckedChange={(on) => set("features.finger_jump", on)}
        />
        <Switch
          label={
            <>
              Blank the screen with an open palm <Changed show={changed.has("features.blank")} />
            </>
          }
          description={`Turns the projected screen black, and back. ${noBlank ? `Not available in ${profile?.name ?? "this app"}.` : "Not available in PDF viewers."}`}
          checked={values.features.blank}
          onCheckedChange={(on) => set("features.blank", on)}
        />
        <Switch
          label={
            <>
              Two-hand counting for slides 6 to 10 <Changed show={changed.has("features.two_hand")} />
            </>
          }
          description="One hand shows five, the other adds one to five. Off by default because it is easier to misread."
          checked={values.features.two_hand}
          onCheckedChange={(on) => set("features.two_hand", on)}
        />
        <Switch
          label={
            <>
              Start paused <Changed show={changed.has("start_paused")} />
            </>
          }
          description="WaveSlide ignores gestures until you show a thumbs up, so setting up never changes a slide."
          checked={values.start_paused}
          onCheckedChange={(on) => set("start_paused", on)}
        />
      </div>
    </SetSection>
  );
}

export function OverlaySection() {
  const { values, changed, set } = useDraft();
  return (
    <SetSection
      title="Overlay"
      description="The small window that stays on top of your slides. If your laptop screen is mirrored to the projector, the audience sees it too."
    >
      <div className={styles.list}>
        <Switch
          label={
            <>
              Show the overlay <Changed show={changed.has("overlay.visible")} />
            </>
          }
          description="Hide it if the audience can see your laptop screen."
          checked={values.overlay.visible}
          onCheckedChange={(on) => set("overlay.visible", on)}
        />
        <Switch
          label={
            <>
              Show the camera image <Changed show={changed.has("overlay.show_preview")} />
            </>
          }
          description="Off shows landmarks on a dark background only."
          checked={values.overlay.show_preview}
          onCheckedChange={(on) => set("overlay.show_preview", on)}
        />
        <Switch
          label={
            <>
              Draw the hand landmarks <Changed show={changed.has("overlay.show_landmarks")} />
            </>
          }
          description="The counted fingers are numbered at the tips."
          checked={values.overlay.show_landmarks}
          onCheckedChange={(on) => set("overlay.show_landmarks", on)}
        />
      </div>
      <div className={styles.size}>
        <span className={styles.sizeLabel}>
          Size <Changed show={changed.has("overlay.compact")} />
        </span>
        <Segmented
          label="Overlay size"
          value={values.overlay.compact ? "compact" : "full"}
          onValueChange={(size) => set("overlay.compact", size === "compact")}
          options={[
            { value: "full", label: "Full, 340 × 280" },
            { value: "compact", label: "Compact, 220 × 56" },
          ]}
        />
      </div>
    </SetSection>
  );
}
