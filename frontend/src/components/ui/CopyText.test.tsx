import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyText } from "./CopyText";
import { truncateMiddle } from "./truncateMiddle";

const HASH = "0x3f2a8b7c6d5e4f30291817161514131211109c1d";

describe("truncateMiddle", () => {
  it("keeps both ends and leaves short values alone", () => {
    expect(truncateMiddle(HASH)).toBe("0x3f2a…9c1d");
    expect(truncateMiddle("INV-0042")).toBe("INV-0042");
  });
});

describe("CopyText", () => {
  it("shows the short form but keeps the full value for hover and screen readers", () => {
    render(<CopyText value={HASH} label="transaction hash" />);
    expect(screen.getByText("0x3f2a…9c1d")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(HASH)).toBeInTheDocument();
    expect(screen.getByTitle(HASH)).toBeInTheDocument();
  });

  it("copies the full value and confirms it", async () => {
    const user = userEvent.setup(); // installs a clipboard stub
    render(<CopyText value={HASH} label="transaction hash" />);
    await user.click(screen.getByRole("button", { name: "Copy transaction hash" }));
    expect(await navigator.clipboard.readText()).toBe(HASH);
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("falls back to showing the value selected when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("blocked"));
    render(<CopyText value={HASH} label="transaction hash" />);
    await user.click(screen.getByRole("button", { name: "Copy transaction hash" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Press (Ctrl|Cmd)\+C/);
    expect(window.getSelection()?.toString()).toBe(HASH);
  });
});
