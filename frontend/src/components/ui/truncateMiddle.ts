// Middle truncation for ids, hashes and addresses: both ends stay readable ("0x3f2a…9c1d"),
// because people compare the start and the end of such values, not the middle.

export function truncateMiddle(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${tail > 0 ? value.slice(-tail) : ""}`;
}
