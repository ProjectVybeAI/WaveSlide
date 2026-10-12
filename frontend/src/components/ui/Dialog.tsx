// Dialog: a modal for short focused tasks (Radix: focus trap, Esc closes, background inert).
// Opened from page state rather than a Radix trigger, focus would land on <body> on close,
// so we remember whatever had focus when it opened and send focus back there.
import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useRef, type ReactNode, type RefObject } from "react";
import { IconButton } from "./IconButton";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** One sentence under the title; it also becomes the dialog's accessible description. */
  description?: ReactNode;
  children?: ReactNode;
  /** Actions, the cancelling one first and the confirming one last. */
  footer?: ReactNode;
  /** An element that opens the dialog when it is not opened from page state. */
  trigger?: ReactNode;
  /** Focus this on open (the safe choice) instead of the first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  size?: "sm" | "md" | "lg";
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  initialFocus,
  size = "md",
}: DialogProps) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={`${styles.content} ${styles[size]}`}
          onOpenAutoFocus={(event) => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            if (!initialFocus?.current) return;
            event.preventDefault();
            initialFocus.current.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!opener.current?.isConnected) return;
            event.preventDefault();
            opener.current.focus();
          }}
          // With no description, tell Radix there is nothing to describe (silences its warning).
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>
          ) : null}
          {children ? <div className={styles.body}>{children}</div> : null}
          {footer ? <div className={styles.footer}>{footer}</div> : null}
          {/* Last in the DOM (drawn in the corner), so opening focus lands on the content, not on Close. */}
          <RadixDialog.Close asChild>
            <IconButton icon={X} label="Close" size="sm" className={styles.close} />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Closes the surrounding Dialog: <DialogClose asChild><Button>Cancel</Button></DialogClose>. */
export const DialogClose = RadixDialog.Close;
