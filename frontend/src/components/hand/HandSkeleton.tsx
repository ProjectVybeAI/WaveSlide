// The counted hand: landmarks and bones over the camera image. Fingers the recogniser counts as
// extended are drawn in the signal colour and numbered at their tips in counting order.
import type { HandLandmarks } from "@/api/types";
import { CONNECTIONS, COUNT_ORDER, FINGERS, VIEW_H, VIEW_W } from "./landmarks";
import styles from "./HandSkeleton.module.css";

type Props = {
  hands: HandLandmarks[];
  /** Per finger of the first hand (thumb, index, middle, ring, little); null = not known yet. */
  extended?: boolean[] | null;
  className?: string;
};

export function HandSkeleton({ hands, extended, className }: Props) {
  return (
    <svg className={className ?? styles.svg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
      {hands.map((hand, handIndex) => (
        <Hand key={handIndex} hand={hand} extended={handIndex === 0 ? extended : null} />
      ))}
    </svg>
  );
}

function Hand({ hand, extended }: { hand: HandLandmarks; extended?: boolean[] | null }) {
  const points = hand.landmarks.map(([x = 0, y = 0]) => [x * VIEW_W, y * VIEW_H] as const);
  const litPoints = new Set<number>();
  extended?.forEach((isExtended, finger) => {
    if (isExtended) FINGERS[finger]?.forEach((p) => litPoints.add(p));
  });
  const isLit = (a: number, b: number) => litPoints.has(a) && litPoints.has(b);

  const numbers = COUNT_ORDER.filter((finger) => extended?.[finger]).flatMap((finger, i) => {
    const tip = FINGERS[finger]?.[3];
    const point = tip === undefined ? undefined : points[tip];
    return point ? [{ n: i + 1, x: point[0], y: point[1] }] : [];
  });

  return (
    <g>
      {CONNECTIONS.map(([a, b]) => {
        const pa = points[a];
        const pb = points[b];
        if (!pa || !pb) return null;
        return (
          <line
            key={`${a}-${b}`}
            className={isLit(a, b) ? styles.boneLit : styles.bone}
            x1={pa[0]}
            y1={pa[1]}
            x2={pb[0]}
            y2={pb[1]}
          />
        );
      })}
      {points.map(([x, y], i) => (
        <circle key={i} className={litPoints.has(i) ? styles.jointLit : styles.joint} cx={x} cy={y} r={4} />
      ))}
      {numbers.map(({ n, x, y }) => (
        <g key={n} transform={`translate(${x} ${y - 22})`}>
          <circle className={styles.badge} r={14} />
          <text className={styles.badgeText} textAnchor="middle" dominantBaseline="central">
            {n}
          </text>
        </g>
      ))}
    </g>
  );
}
