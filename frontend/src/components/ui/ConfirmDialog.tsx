// ConfirmDialog: only for destructive, irreversible actions (prefer undo for reversible ones).
// The title names the object ('Delete lease "Flat 4B"?'), the confirm button repeats the verb
// ("Delete lease"), only that button is red, and Cancel has focus first so Enter is safe.
import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog, DialogClose } from "./Dialog";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question that names the object: 'Delete lease "Flat 4B"?' */
  title: ReactNode;
  /** What will be lost, in plain words. */
  children?: ReactNode;
  /** The verb and object again: "Delete lease". Never "OK" or "Yes". */
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** True while the action runs: the dialog stays open and the button says pendingLabel. */
  pending?: boolean;
  /** "danger" for deletes and other losses; "primary" for heavy but non-destructive steps. */
  tone?: "danger" | "primary";
  trigger?: ReactNode;
};

export function ConfirmDialog({
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
  tone = "danger",
  children,
  ...dialog
}: ConfirmDialogProps) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      {...dialog}
      size="sm"
      initialFocus={cancel}
      onOpenChange={(open) => {
        if (!pending) dialog.onOpenChange(open); // no closing half-way through the action
      }}
      footer={
        <>
          <DialogClose asChild>
            <Button ref={cancel} variant="secondary" disabled={pending}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button variant={tone} pending={pending} pendingLabel={pendingLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
