// The practice rail: how fast the last gesture reached the slide, and the gestures to try now,
// worded from the saved mappings (so a swapped swipe direction shows up here).
import { Callout, Button, ErrorState, Skeleton } from "@/components/ui";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { GESTURE_LABEL, type GlyphPose } from "@/components/hand/glyph";
import { toMessage } from "@/api/errors";
import { useSaveSettings, useSettings } from "@/features/settings/api";
import { SETTINGS_DEFAULTS } from "@/features/settings/settingsSchema";
import { SLIDE_COUNT } from "./deck";
import type { Ack } from "./useDeck";
import styles from "./Rail.module.css";

type Try = { pose: GlyphPose; title: string; text: string };

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function Rail({ slide, ack }: { slide: number; ack: Ack | null }) {
  const settings = useSettings();
  const save = useSaveSettings();
  const values = settings.data;
  const mappings = { ...SETTINGS_DEFAULTS.mappings, ...values?.mappings };
  const timing = { ...SETTINGS_DEFAULTS.timing, ...values?.timing };

  const swipe = (gesture: GlyphPose, text: string): Try => ({
    pose: gesture,
    title: GESTURE_LABEL[gesture],
    text,
  });
  const held = (gesture: GlyphPose, ms: number, text: string): Try => ({
    pose: gesture,
    title: `${GESTURE_LABEL[gesture]}, held ${seconds(ms)}`,
    text,
  });
  const tries: Try[] = [
    swipe(
      mappings.next,
      slide < SLIDE_COUNT ? `Next slide, slide ${slide + 1}` : "Next slide, but this is the last one",
    ),
    swipe(
      mappings.previous,
      slide > 1 ? `Previous slide, slide ${slide - 1}` : "Previous slide, but this is the first one",
    ),
    { pose: "COUNT_5", title: "Hold up 1 to 5 fingers", text: "Jump to that slide" },
    held(mappings.blank_toggle, timing.hold_palm_ms, "Blank the screen, and back"),
    held(mappings.toggle_active, timing.hold_pose_ms, "Pause, so you can talk with your hands"),
  ];

  const notPractice = values && values.profile_id !== "practice";

  return (
    <aside className={styles.rail} aria-label="Gestures to try">
      {notPractice ? (
        <Callout
          tone="warning"
          title="Gestures are going to another app"
          action={
            <Button
              size="sm"
              pending={save.isPending}
              pendingLabel="Switching"
              onClick={() => save.mutate({ ...values, profile_id: "practice" })}
            >
              Use the practice deck
            </Button>
          }
        >
          Your app profile sends keys to your presentation app, so this deck ignores them. Switch to the
          practice deck profile to drive it with gestures.
        </Callout>
      ) : null}
      {save.error ? <p className={styles.error}>{save.error.message}</p> : null}

      <div className={styles.ack} aria-live="polite">
        {ack ? (
          <>
            <p className={styles.ackTitle}>
              <span className={styles.dot} aria-hidden="true" />
              {ack.title}
            </p>
            <dl className={styles.figures}>
              <div>
                <dt>Capture to key</dt>
                <dd>
                  {Math.round(ack.captureToKey)}
                  <small>ms</small>
                </dd>
              </div>
              <div>
                <dt>Key to slide on screen</dt>
                <dd>
                  {ack.keyToSlide === null ? "–" : Math.round(ack.keyToSlide)}
                  <small>ms</small>
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className={styles.ackTitle}>No gesture yet</p>
            <p className={styles.help}>
              Go live with a thumbs up, then try a swipe. How fast each gesture reaches the slide shows here.
            </p>
          </>
        )}
      </div>

      <section aria-labelledby="try-title">
        <h2 id="try-title" className={styles.title}>
          Try on this slide
        </h2>
        {settings.isPending ? (
          <Skeleton shape="text" lines={5} />
        ) : settings.isError ? (
          <ErrorState
            headingLevel={3}
            title="Your gestures could not be loaded"
            message={toMessage(settings.error)}
            onRetry={() => void settings.refetch()}
            retrying={settings.isFetching}
          />
        ) : (
          <ul className={styles.tries}>
            {tries.map((item) => (
              <li key={item.title} className={styles.try}>
                <PoseGlyph pose={item.pose} size={36} />
                <div>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className={styles.help}>
        Gestures drive this deck through the same keys PowerPoint gets, but WaveSlide never sends keys to
        another app while you practise here.
      </p>
    </aside>
  );
}
