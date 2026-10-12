import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("states the status in words, with a decorative icon (never colour alone)", () => {
    const { container } = render(<StatusPill tone="danger">Overdue</StatusPill>);
    expect(screen.getByText("Overdue")).toBeVisible();
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
