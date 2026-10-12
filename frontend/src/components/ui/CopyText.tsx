// CopyText: an id, hash or key in mono, middle-truncated, with a copy button. The full value is
// in the title (hover) and read in full by screen readers; "Copied" is announced and shown for a
// moment. If the browser blocks the clipboard (an http origin), the full value is shown selected
// with "Press Ctrl+C", so it can still be copied.
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { truncateMiddle } from "./truncateMiddle";
import { VisuallyHidden } from "./VisuallyHidden";
import styles from "./CopyText.module.css";

type CopyState = "idle" | "copied" | "manual";

export type CopyTextProps = {
  value: string;
  /** What the value is, for the button: "Copy order ID". */
  label?: string;
  /** Characters kept at the start and end. Use 0 for `tail` with `head` = length to show it all. */
  head?: number;
  tail?: number;
  className?: string;
};

export function CopyText({ value, label = "value", head = 6, tail = 4, className }: CopyTextProps) {
  const [state, setState] = useState<CopyState>("idle");
  const text = useRef<HTMLSpanElement>(null);

  // "Copied" goes back to the copy icon after a moment; the manual fallback stays a bit longer.
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), state === "copied" ? 2000 : 8000);
    return () => window.clearTimeout(timer);
  }, [state]);

  // In the manual fallback, select the full value so Ctrl+C copies exactly it.
  useEffect(() => {
    if (state !== "manual" || !text.current) return;
    const range = document.createRange();
    range.selectNodeContents(text.current);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd+C" : "Ctrl+C";
  return (
    <span className={clsx(styles.copyText, state === "manual" && styles.manual, className)}>
      <span ref={text} className={styles.value} title={value}>
        {state === "manual" ? (
          value
        ) : (
          <>
            <span aria-hidden="true">{truncateMiddle(value, head, tail)}</span>
            <VisuallyHidden>{value}</VisuallyHidden>
          </>
        )}
      </span>
      <button
        type="button"
        className={clsx(styles.button, state === "copied" && styles.copied)}
        onClick={copy}
        aria-label={`Copy ${label}`}
      >
        {state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      <span role="status" className={state === "idle" ? styles.statusIdle : styles.status}>
        {state === "copied" ? "Copied" : state === "manual" ? `Press ${shortcut}` : ""}
      </span>
    </span>
  );
}
