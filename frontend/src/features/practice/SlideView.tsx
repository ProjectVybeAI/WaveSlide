// One practice slide at 16:9, or a black screen when blanked. The slide is WaveSlide's own, drawn
// in its slide colours; sizes follow the slide's width, so it reads the same in the window and full screen.
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { SLIDE_COUNT, SLIDES } from "./deck";
import styles from "./SlideView.module.css";

type Props = { slide: number; blank: boolean };

export function SlideView({ slide, blank }: Props) {
  const content = SLIDES[slide - 1];
  if (!content) return null;
  return (
    <div className={styles.slide} data-blank={blank}>
      {blank ? (
        <p className={styles.blank}>
          Screen blanked. Hold the blank gesture again, or press B, to bring the slide back.
        </p>
      ) : (
        <>
          <p className={styles.number}>{slide}</p>
          <h3 className={styles.title}>{content.title}</h3>
          <p className={styles.body}>{content.body}</p>
          <div className={styles.hand}>
            <PoseGlyph pose={content.pose} size="fill" label={GESTURE_LABEL[content.pose]} />
          </div>
          <p className={styles.foot}>
            Practice deck, slide {slide} of {SLIDE_COUNT}
          </p>
        </>
      )}
    </div>
  );
}
