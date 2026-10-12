// MediaPipe hand topology: 21 landmarks, the bones between them, and each finger's points.
export const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

/** Points of each finger, in the engine's `extended` order: thumb, index, middle, ring, little. */
export const FINGERS: ReadonlyArray<readonly number[]> = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

/** Counting order (DESIGN.md "the counted hand"): index, middle, ring, little, then thumb. */
export const COUNT_ORDER = [1, 2, 3, 4, 0] as const;

/** The camera image is 4:3; landmarks are 0..1 of it. */
export const VIEW_W = 640;
export const VIEW_H = 480;
