import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("names the object, focuses Cancel first, and confirms from the verb button", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title='Delete lease "Flat 4B"?'
        confirmLabel="Delete lease"
        onConfirm={onConfirm}
      >
        The lease and its 3 documents are removed for everyone.
      </ConfirmDialog>,
    );
    expect(screen.getByRole("dialog", { name: 'Delete lease "Flat 4B"?' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Delete lease" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("cannot be closed while the action is pending", async () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        pending
        pendingLabel="Deleting…"
        onOpenChange={onOpenChange}
        title='Delete lease "Flat 4B"?'
        confirmLabel="Delete lease"
        onConfirm={() => {}}
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Deleting…" })).toHaveAttribute("aria-busy", "true");
  });
});
