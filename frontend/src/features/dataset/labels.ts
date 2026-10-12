// The words the Dataset screen uses for the contract's session fields, and how its numbers are written.
import type { SessionSummary } from "@/api/types";

export const KIND_LABEL: Record<SessionSummary["kind"], string> = {
  gestures: "Gestures",
  talking: "Talking",
  two_hand: "Two hands",
  demo: "Demo",
};

export const LIGHTING_LABEL = { bright: "Bright", normal: "Normal", dim: "Dim" } as const;

const wholeNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const distance = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatCount = (n: number) => wholeNumber.format(n);
export const formatDistance = (metres: number | null) =>
  metres === null ? "–" : `${distance.format(metres)} m`;
export const formatLuminance = (value: number | null) => (value === null ? "–" : wholeNumber.format(value));
export const formatWhen = (iso: string) => day.format(new Date(iso));

/** 150.4 -> "2:30". Sessions run from seconds to minutes. */
export function formatLength(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** "1 session" / "3 sessions". */
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${formatCount(n)} ${n === 1 ? one : many}`;
