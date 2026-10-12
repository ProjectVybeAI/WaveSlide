import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("announces what failed and retries on request", async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Invoices could not be loaded" message="The server did not answer." onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Invoices could not be loaded");
    expect(alert).toHaveTextContent("The server did not answer.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows no retry button without onRetry", () => {
    render(<ErrorState message="Nothing to retry." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the retry button in place and busy while retrying", () => {
    render(<ErrorState onRetry={() => {}} retrying />);
    expect(screen.getByRole("button", { name: "Trying again" })).toHaveAttribute("aria-busy", "true");
  });
});
