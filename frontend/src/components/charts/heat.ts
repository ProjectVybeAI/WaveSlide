// The numbers behind a confusion-matrix heat map: how dark a cell is, and what it says.
// Cells are the share of their row (what the hand did), so every row reads as 100%.
export type HeatLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Upper edge of each step, matching --color-seq-1 ... --color-seq-7 (DESIGN.md "Colour").
const STEPS: Array<{ upTo: number; level: HeatLevel }> = [
  { upTo: 0.02, level: 1 },
  { upTo: 0.05, level: 2 },
  { upTo: 0.1, level: 3 },
  { upTo: 0.25, level: 4 },
  { upTo: 0.6, level: 5 },
  { upTo: 0.85, level: 6 },
];

/** Level 0 is an empty cell and shows the surface; 7 is the top step. */
export function heatLevel(share: number): HeatLevel {
  if (share <= 0) return 0;
  return STEPS.find((step) => share <= step.upTo)?.level ?? 7;
}

/** Light cells (from the 10% to 25% step up) take dark ink; dark cells keep light text. */
export const usesDarkInk = (level: HeatLevel) => level >= 4;

export function rowTotal(row: number[]): number {
  return row.reduce((sum, count) => sum + count, 0);
}

/** The text in a cell: a whole percentage, "<1" for a few frames, nothing for none. */
export function cellText(count: number, total: number): string {
  if (count === 0 || total === 0) return "";
  const percent = (count / total) * 100;
  return percent < 1 ? "<1" : String(Math.round(percent));
}

/** The share of a row that sits on its diagonal cell: how often that pose was recognised. */
export function rowAccuracy(row: number[], index: number): number {
  const total = rowTotal(row);
  return total === 0 ? 0 : (row[index] ?? 0) / total;
}
