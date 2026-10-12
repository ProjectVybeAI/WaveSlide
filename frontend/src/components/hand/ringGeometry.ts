// Shapes for the hold ring, in the ring's own -50..50 drawing units.
export const RADIUS = 36;
export const TICK_INNER = 39.5;
export const TICK_OUTER = 46.5;

export const polar = (radius: number, turn: number): [number, number] => {
  const angle = (-90 + 360 * turn) * (Math.PI / 180);
  return [Math.round(Math.cos(angle) * radius * 100) / 100, Math.round(Math.sin(angle) * radius * 100) / 100];
};

/** A pie slice from 12 o'clock clockwise. */
export function sweepPath(radius: number, turn: number): string {
  if (turn <= 0) return "";
  if (turn >= 0.999) return `M0 ${-radius} A${radius} ${radius} 0 1 1 -0.01 ${-radius} Z`;
  const [x, y] = polar(radius, turn);
  return `M0 0 L0 ${-radius} A${radius} ${radius} 0 ${turn > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

export function arcPath(radius: number, turn: number): string {
  if (turn <= 0) return "";
  if (turn >= 0.999) return `M0 ${-radius} A${radius} ${radius} 0 1 1 -0.01 ${-radius}`;
  const [x, y] = polar(radius, turn);
  return `M0 ${-radius} A${radius} ${radius} 0 ${turn > 0.5 ? 1 : 0} 1 ${x} ${y}`;
}
