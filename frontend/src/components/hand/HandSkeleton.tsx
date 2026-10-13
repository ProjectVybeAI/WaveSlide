// The counted hand: landmarks and bones over the camera image. Fingers the recogniser counts as
// extended are drawn in the signal colour and numbered at their tips in counting order, so the
// picture shows why the count is 3. Coordinates arrive already mirrored (0..1 of the image).
import clsx from "clsx";
import type { HandLandmarks } from "@/api/types";
import { CONNECTIONS, COUNT_ORDER, FINGERS, VIEW_H, VIEW_W } from "./landmarks";
import styles from "./HandSkeleton.module.css";

/** Sizes in viewBox units (the drawing is 640 wide): about 0.29 px each in the 184 px overlay camera, 1.1 px on Live. */
const MARKS = {
  small: { bone: 7, joint: 5, badge: 30, text: 40 },
  large: { bone: 6, joint: 5, badge: 25, text: 32 },
};
type Marks = (typeof MARKS)[keyof typeof MARKS];

type Props = {
  hands: HandLandmarks[];
  /** Per finger of the first hand (thumb, index, middle, ring, little); null = not known yet. */
  extended?: boolean[] | null;
  /** "small" for the 184 px overlay camera, "large" for the Live monitor. Marks scale with the picture. */
  size?: "small" | "large";
  /** Paused or camera lost: nothing is being counted, so draw plain grey bones and no numbers. */
  muted?: boolean;
  className?: string;
};

export function HandSkeleton({ hands, extended, size = "large", muted = false, className }: Props) {
  return (
    <svg className={clsx(styles.svg, className)} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
      {hands.map((hand, handIndex) => (
        <Hand
          key={handIndex}
          hand={hand}
          extended={handIndex === 0 && !muted ? extended : null}
          marks={MARKS[size]}
          muted={muted}
        />
      ))}
    </svg>
  );
}

type HandProps = { hand: HandLandmarks; extended?: boolean[] | null; marks: Marks; muted: boolean };

function Hand({ hand, extended, marks, muted }: HandProps) {
  const points = hand.landmarks.map(([x = 0, y = 0]) => [x * VIEW_W, y * VIEW_H] as const);
  const litPoints = new Set<number>();
  extended?.forEach((isExtended, finger) => {
    if (isExtended) FINGERS[finger]?.forEach((p) => litPoints.add(p));
  });
  const isLit = (a: number, b: number) => litPoints.has(a) && litPoints.has(b);

  // The dark casing under the bones keeps them readable over a bright camera image.
  const casing = CONNECTIONS.flatMap(([a, b]) => {
    const pa = points[a];
    const pb = points[b];
    return pa && pb ? [`M${pa[0]} ${pa[1]}L${pb[0]} ${pb[1]}`] : [];
  }).join("");

  const numbers = COUNT_ORDER.filter((finger) => extended?.[finger]).flatMap((finger, i) => {
    const tip = FINGERS[finger]?.[3];
    const point = tip === undefined ? undefined : points[tip];
    return point ? [{ n: i + 1, x: point[0], y: point[1] }] : [];
  });
  // Badges shrink to fit when the counted fingertips are close together, so they never overlap.
  const tipSpacing = Math.min(
    ...numbers.flatMap((a, i) => numbers.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
  );
  const badge = Math.min(marks.badge, tipSpacing * 0.42);
  const text = marks.text * (badge / marks.badge);
  const numbered = new Set(
    numbers.length ? COUNT_ORDER.filter((f) => extended?.[f]).map((f) => FINGERS[f]?.[3]) : [],
  );

  return (
    <g>
      <path className={styles.casing} d={casing} strokeWidth={marks.bone + 5} />
      {CONNECTIONS.map(([a, b]) => {
        const pa = points[a];
        const pb = points[b];
        if (!pa || !pb) return null;
        return (
          <line
            key={`${a}-${b}`}
            className={isLit(a, b) ? styles.boneLit : muted ? styles.boneMuted : styles.bone}
            x1={pa[0]}
            y1={pa[1]}
            x2={pb[0]}
            y2={pb[1]}
            strokeWidth={marks.bone}
          />
        );
      })}
      {points.map(([x, y], i) =>
        numbered.has(i) ? null : (
          <circle
            key={i}
            className={litPoints.has(i) ? styles.jointLit : muted ? styles.jointMuted : styles.joint}
            cx={x}
            cy={y}
            r={marks.joint}
          />
        ),
      )}
      {numbers.map(({ n, x, y }) => (
        <g key={n} transform={`translate(${x} ${y - badge * 1.2})`}>
          <circle className={styles.badge} r={badge} />
          <text className={styles.badgeText} fontSize={text} textAnchor="middle" dominantBaseline="central">
            {n}
          </text>
        </g>
      ))}
    </g>
  );
}
