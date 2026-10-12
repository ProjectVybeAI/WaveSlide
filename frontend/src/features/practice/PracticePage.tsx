// Practice deck: ten slides driven by gestures (through the engine's command events) or the keyboard,
// so a presenter can try every gesture before opening PowerPoint.
import { Keyboard, Maximize2, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { KeyCaps } from "@/components/hand/KeyCaps";
import { Button, PageHeader } from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { DeckStrip } from "./DeckStrip";
import { Rail } from "./Rail";
import { SLIDE_COUNT } from "./deck";
import { SlideView } from "./SlideView";
import { useDeck } from "./useDeck";
import styles from "./PracticePage.module.css";

export function PracticePage() {
  useDocumentTitle("Practice deck");
  const { deck, move, typed, ack } = useDeck();
  const stage = useRef<HTMLDivElement>(null);
  const canPresent = typeof document !== "undefined" && document.fullscreenEnabled;

  return (
    <>
      <PageHeader
        title="Practice deck"
        description="Ten slides to try every gesture before you open PowerPoint. The keyboard works here too."
        actions={
          <>
            <div className={styles.keys} aria-label="Keyboard shortcuts">
              <Keyboard size={16} aria-hidden="true" />
              {typed ? (
                <span role="status">
                  Slide {typed}, then <KeyCaps keys={["enter"]} />
                </span>
              ) : (
                <>
                  <KeyCaps keys={["left", "right"]} />
                  <KeyCaps keys={["1"]} />…<KeyCaps keys={["9"]} />
                  <KeyCaps keys={["enter"]} />
                  <KeyCaps keys={["b"]} />
                </>
              )}
            </div>
            <Button
              icon={RotateCcw}
              onClick={() => move({ type: "reset" })}
              disabled={deck.slide === 1 && !deck.blank}
            >
              Back to slide 1
            </Button>
            {canPresent ? (
              <Button
                variant="primary"
                icon={Maximize2}
                onClick={() => void stage.current?.requestFullscreen()}
              >
                Present full screen
              </Button>
            ) : null}
          </>
        }
      />
      <div className={styles.body}>
        <section className={styles.stage} aria-labelledby="deck-title">
          <h2 id="deck-title" className="visually-hidden">
            Slide {deck.slide} of {SLIDE_COUNT}
            {deck.blank ? ", screen blanked" : ""}
          </h2>
          <div ref={stage} className={styles.screen} aria-live="polite">
            <SlideView slide={deck.slide} blank={deck.blank} />
          </div>
          <DeckStrip current={deck.slide} from={deck.from} />
        </section>
        <Rail slide={deck.slide} ack={ack} />
      </div>
    </>
  );
}
