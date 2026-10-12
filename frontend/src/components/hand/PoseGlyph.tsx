// A pose as a small pictogram, for selects, the command log, the practice rail and slides.
// Decorative by default (the word sits next to it); pass `label` when it stands alone.
import { clsx } from "clsx";
import { glyphGeometry, type GlyphPose } from "./glyph";
import styles from "./PoseGlyph.module.css";

type Props = {
  pose: GlyphPose;
  /** Square size in CSS pixels (written as rem), or "fill" to take the width of the box it sits in. */
  size?: number | "fill";
  label?: string;
  className?: string;
};

export function PoseGlyph({ pose, size = 24, label, className }: Props) {
  const { viewBox, strokeWidth, shapes } = glyphGeometry(pose);
  return (
    <svg
      className={clsx(styles.glyph, className)}
      style={
        size === "fill"
          ? { width: "100%", height: "auto" }
          : { width: `${size / 16}rem`, height: `${size / 16}rem` }
      }
      viewBox={viewBox}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shapes.map((shape, i) => {
        if (shape.kind === "dot") {
          return <circle key={i} className={styles.tip} cx={shape.at[0]} cy={shape.at[1]} r={shape.r} />;
        }
        if (shape.kind === "path") {
          return (
            <path
              key={i}
              className={styles[shape.tone]}
              d={shape.d}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          );
        }
        return (
          <line
            key={i}
            className={styles[shape.tone]}
            x1={shape.from[0]}
            y1={shape.from[1]}
            x2={shape.to[0]}
            y2={shape.to[1]}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </svg>
  );
}
