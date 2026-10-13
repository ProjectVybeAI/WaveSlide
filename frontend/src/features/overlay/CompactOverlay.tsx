// The compact strip (220 x 56): the tally band, the dial at 44 px and one line of text. The dial and
// its target stay readable at this size; the band is also the way back to the full overlay.
import { describeCue, commandLabel, type Cue } from "@/components/hand/cue";
import { HoldRing } from "@/components/hand/HoldRing";
import type { CommandLogEntry } from "@/api/types";
import { formatMs } from "@/lib/format";
import styles from "./CompactOverlay.module.css";

type Props = {
  band: {
    kind: "live" | "paused" | "blocked" | "error";
    word: string;
    sub: string;
    short: string;
    /** How to go live again, short enough for the strip: "Thumbs up 1 s". */
    resume: string;
  };
  cue: Cue;
  lastCommand: CommandLogEntry | null;
  lastBlocked: boolean;
  onExpand: () => void;
};

/** The two text lines beside the dial. */
function lines(
  cue: Cue,
  lastCommand: CommandLogEntry | null,
  lastBlocked: boolean,
  resume: string,
): [string, string] {
  switch (cue.mode) {
    case "standby":
      return [cue.target, "Standby"];
    case "go":
      return [cue.target, ""];
    case "cooldown":
      return [lastCommand ? commandLabel(lastCommand) : cue.target, "Cooldown"];
    case "paused":
      return [cue.word, resume];
    case "cancelled":
    case "blocked":
    case "camera":
    case "error":
      return [cue.word, cue.target];
    default:
      if (lastCommand && !lastBlocked && cue.mode === "ready")
        return [commandLabel(lastCommand), formatMs(lastCommand.pipeline_ms)];
      return [cue.word, cue.target];
  }
}

export function CompactOverlay({ band, cue, lastCommand, lastBlocked, onExpand }: Props) {
  const [first, second] = lines(cue, lastCommand, lastBlocked, band.resume);
  return (
    <section
      className={styles.strip}
      data-band={band.kind}
      aria-label={`WaveSlide overlay, compact, ${band.word}`}
    >
      <h1 className="visually-hidden">WaveSlide overlay</h1>
      <button
        type="button"
        className={styles.band}
        onClick={onExpand}
        aria-label={`${band.word}. Show the full overlay`}
      >
        <span className={styles.word}>{band.word}</span>
        <span className={styles.sub}>{band.short}</span>
      </button>
      <div className={styles.dial}>
        <HoldRing
          state={cue.ring.state}
          progress={cue.ring.progress}
          holdMs={cue.ring.holdMs}
          label={cue.ring.label}
          caption=""
          cooldown={cue.ring.cooldown}
          size={44}
          description={describeCue(cue)}
        />
      </div>
      <div className={styles.text} aria-live="polite">
        <span className={styles.first}>{first}</span>
        <span className={styles.second}>{second}</span>
      </div>
    </section>
  );
}
