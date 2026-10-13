// The hold ring (DESIGN.md "the cue dial"): a lamp disc that fills clockwise while a held gesture is
// on standby. One tick per 100 ms of the hold, so the hold setting is visible in the object. The
// sweep is data (`progress` from frame.hold), not animation; only the jump to solid on Go is a
// 90 ms fade, and it is instant under reduced motion because --duration-go is 0 there.
import { clsx } from "clsx";
import { useId } from "react";
import { PoseGlyph } from "./PoseGlyph";
import type { GlyphPose } from "./glyph";
import { arcPath, sweepPath, RADIUS, TICK_INNER, TICK_OUTER, polar } from "./ringGeometry";
import styles from "./HoldRing.module.css";

/** idle: an unlit lamp. standby: filling. go: solid. cooldown: a grey arc draining. cancel: grey sweep. */
export type RingState = "idle" | "standby" | "go" | "cooldown" | "cancel";

export type HoldRingProps = {
  state: RingState;
  /** Standby and cancel: how much of the hold has passed, 0 to 1. */
  progress?: number;
  /** The hold time; one tick is drawn per 100 ms. */
  holdMs?: number;
  /** The target inside: a slide number, "Blank", "Next", "Live". */
  label?: string;
  /** A small caption above it: "Slide", "Screen", "Go". */
  caption?: string;
  /** Cooldown: the part of the arc still to drain, 1 to 0. */
  cooldown?: number;
  /** Width and height in CSS pixels (written as rem). */
  size?: number;
  /** A pose pictogram above the label (the Settings preview for the hold that goes live). */
  glyph?: GlyphPose;
  /** What a screen reader hears instead of the drawing. */
  description: string;
  className?: string;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function HoldRing({
  state,
  progress = 0,
  holdMs = 1000,
  label = "",
  caption = "",
  cooldown = 0,
  size = 104,
  glyph,
  description,
  className,
}: HoldRingProps) {
  const clipId = useId();
  const ticks = Math.max(0, Math.round(holdMs / 100));
  const turn = clamp(progress);
  const showsSweep = state === "standby" || state === "cancel";
  // Standby: the sweep follows the data. Go: a full disc that fades in over --duration-go.
  const sweep = showsSweep ? sweepPath(RADIUS, turn) : "";
  const passedTicks = state === "go" ? ticks : state === "standby" ? Math.floor(turn * ticks + 1e-6) : 0;
  const long = label.length > 2;
  const numeralSize = glyph ? 24 : label.length > 5 ? 20 : long ? 24 : 46;
  const numeralY = glyph ? 32 : long ? 8 + numeralSize * 0.3 : 22;

  return (
    <svg
      className={clsx(styles.ring, styles[state], className)}
      style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}
      viewBox="-50 -50 100 100"
      role="img"
      aria-label={description}
      data-state={state}
    >
      <circle className={styles.disc} r={RADIUS} />
      {Array.from({ length: ticks }, (_, index) => {
        const [x1, y1] = polar(TICK_INNER, (index + 1) / ticks);
        const [x2, y2] = polar(TICK_OUTER, (index + 1) / ticks);
        return (
          <line
            key={index}
            className={index < passedTicks ? styles.tickPassed : styles.tick}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth={3}
          />
        );
      })}
      {sweep ? <path className={styles.sweep} d={sweep} /> : null}
      <circle className={styles.solid} r={RADIUS} />
      {state === "cooldown" ? (
        <path className={styles.cool} d={arcPath(RADIUS - 3, clamp(cooldown))} strokeWidth={5} />
      ) : null}
      <circle className={styles.rim} r={RADIUS} strokeWidth={1} />
      {glyph ? (
        <foreignObject x={-18} y={-34} width={36} height={36}>
          <PoseGlyph pose={glyph} size="fill" />
        </foreignObject>
      ) : null}
      {caption ? (
        <text className={styles.caption} y={-15} fontSize={9.5}>
          {caption}
        </text>
      ) : null}
      {label ? (
        <text className={styles.numeral} y={numeralY} fontSize={numeralSize}>
          {label}
        </text>
      ) : null}
      {/* The same text again in the on-accent colour, clipped to the sweep: legible as the sweep passes under it. */}
      {sweep && state === "standby" ? (
        <>
          <clipPath id={clipId}>
            <path d={sweep} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            {caption ? (
              <text className={styles.captionOn} y={-15} fontSize={9.5}>
                {caption}
              </text>
            ) : null}
            {label ? (
              <text className={styles.numeralOn} y={numeralY} fontSize={numeralSize}>
                {label}
              </text>
            ) : null}
          </g>
        </>
      ) : null}
    </svg>
  );
}
