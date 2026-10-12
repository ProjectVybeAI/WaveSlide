import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("runs onClick when idle", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save lease</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save lease" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("while pending: says what it is doing, is busy, ignores clicks and keeps focus", async () => {
    const onClick = vi.fn();
    render(
      <Button pending pendingLabel="Saving…" onClick={onClick}>
        Save lease
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled(); // still focusable
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it("does not submit its form while pending", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <Button type="submit" pending>
          Create invoice
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
