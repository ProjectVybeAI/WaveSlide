// What a real evaluation run needs, checked against the recorded sessions: shown on the empty
// screen so "no runs yet" comes with a list of exactly what is still missing.
import type { SessionSummary } from "@/api/types";

export type Need = {
  label: string;
  have: number;
  want: number;
  /** A run cannot be meaningful without it (as opposed to a nice-to-have for the first run). */
  required: boolean;
  note: string;
};

const DISTANCES = [0.5, 1, 1.5, 2];
const LIGHTS = ["bright", "normal", "dim"];

const distinct = <T>(values: T[]) => new Set(values).size;

export function evaluationNeeds(sessions: SessionSummary[], hasModel: boolean): Need[] {
  const recorded = sessions.filter((session) => session.source === "recorded");
  const people = (kind: SessionSummary["kind"]) =>
    distinct(recorded.filter((session) => session.kind === kind).map((session) => session.participant));
  return [
    {
      label: "Participants with a gestures session",
      have: people("gestures"),
      want: 2,
      required: true,
      note: "Leave-one-participant-out needs at least two people.",
    },
    {
      label: "Talking sessions, 3 minutes each",
      have: people("talking"),
      want: 2,
      required: true,
      note: "Measures false triggers while you talk with your hands.",
    },
    {
      label: "Distances 0.5, 1, 1.5 and 2 m",
      have: distinct(
        recorded.map((session) => session.distance_m).filter((d) => d !== null && DISTANCES.includes(d)),
      ),
      want: DISTANCES.length,
      required: false,
      note: "One participant is enough. Optional for the first run.",
    },
    {
      label: "Bright, normal and dim light",
      have: distinct(
        recorded.map((session) => session.lighting).filter((l) => l !== null && LIGHTS.includes(l)),
      ),
      want: LIGHTS.length,
      required: false,
      note: "Optional for the first run.",
    },
    {
      label: "Trained model",
      have: hasModel ? 1 : 0,
      want: 1,
      required: false,
      note: "Train one in Dataset once two people are recorded. Until then the rules are evaluated alone.",
    },
  ];
}
