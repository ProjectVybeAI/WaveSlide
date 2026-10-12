// Tooltip: a short hint on hover and keyboard focus (Radix). Never the only place important
// information lives (touch screens cannot hover), and never on disabled elements (they get no focus).
//   <Tooltip content="Copy order ID"><IconButton … /></Tooltip>
import { Tooltip as RadixTooltip } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import styles from "./Tooltip.module.css";

export type TooltipProps = {
  /** The hint text. Keep it to a few words. */
  content: ReactNode;
  /** One focusable element (a button or link); it becomes the trigger. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  /** Milliseconds before it opens on hover. */
  delay?: number;
};

export function Tooltip({ content, children, side = "top", delay = 300 }: TooltipProps) {
  // A provider per tooltip keeps the component self-contained; an app-level provider is optional.
  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content side={side} sideOffset={6} collisionPadding={8} className={styles.content}>
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
