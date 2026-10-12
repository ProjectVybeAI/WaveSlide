import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "./Toast";
import { useToast, type ToastInput } from "./toastContext";

function Trigger({ toast }: { toast: ToastInput }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show(toast)}>
      Notify
    </button>
  );
}

function setup(toast: ToastInput) {
  render(
    <ToastProvider duration={5000}>
      <Trigger toast={toast} />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Notify" }));
}

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("announces through a polite live region that exists before the toast", () => {
    setup({ title: "Export ready", tone: "success" });
    const region = screen.getByRole("status", { name: "Notifications" });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Export ready");
  });

  it("dismisses itself after the duration", () => {
    setup({ title: "Export ready" });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText("Export ready")).not.toBeInTheDocument();
  });

  it("pauses while hovered and resumes with the time that was left", () => {
    setup({ title: "Export ready" });
    act(() => vi.advanceTimersByTime(3000));
    const toast = screen.getByText("Export ready");
    fireEvent.mouseEnter(toast.closest("div")!.parentElement!);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("Export ready")).toBeInTheDocument();
    fireEvent.mouseLeave(toast.closest("div")!.parentElement!);
    act(() => vi.advanceTimersByTime(1999));
    expect(screen.getByText("Export ready")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Export ready")).not.toBeInTheDocument();
  });

  it("keeps danger toasts until dismissed", () => {
    setup({ title: "Sync failed", tone: "danger" });
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Sync failed")).not.toBeInTheDocument();
  });
});
