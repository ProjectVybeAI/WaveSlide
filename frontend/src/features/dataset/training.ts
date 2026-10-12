// Which sessions a training or evaluation run should use: the recorded ones, or the synthetic demo
// sessions only while nothing has been recorded. Shared by the Dataset and Evaluation screens.
import type { SessionSummary } from "@/api/types";
import type { SourceChoice } from "./api";

export function trainingSources(sessions: SessionSummary[]): { sources: SourceChoice; participants: number } {
  const recorded = sessions.filter((session) => session.source === "recorded");
  const usable =
    recorded.length > 0 ? recorded : sessions.filter((session) => session.source === "synthetic");
  return {
    sources: recorded.length > 0 || usable.length === 0 ? ["recorded"] : ["synthetic"],
    participants: new Set(usable.map((session) => session.participant)).size,
  };
}
