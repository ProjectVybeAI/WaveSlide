// The recorder's prompt flow: a step is announced with its length, the countdown runs from the
// moment it arrived, the next step replaces it, and the last step ends in "Save session".
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecorderView } from "./RecorderView";
import { toPrompt, type RecorderPrompt } from "./useRecorder";

const step = (over: Partial<RecorderPrompt> = {}): RecorderPrompt => ({
  sessionId: "rec-1",
  step: 3,
  totalSteps: 47,
  prompt: "Hold up 3 fingers",
  gesture: "COUNT_3",
  seconds: 4,
  receivedAt: Date.now(),
  ...over,
});

beforeEach(() => vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }));
afterEach(() => vi.useRealTimers());

function setup(prompt: RecorderPrompt, onStop = vi.fn()) {
  const view = render(<RecorderView prompt={prompt} frame={null} stopping={false} onStop={onStop} />);
  const showing = (next: RecorderPrompt) =>
    view.rerender(<RecorderView prompt={next} frame={null} stopping={false} onStop={onStop} />);
  return { onStop, showing };
}

describe("RecorderView prompt flow", () => {
  it("shows the step, what to do, and the seconds left on the dial", () => {
    setup(step());
    expect(screen.getByText("Step 3 of 47")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hold up 3 fingers" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 seconds left in this step" })).toBeInTheDocument();
    expect(screen.getByText("Three fingers")).toBeInTheDocument(); // the pose glyph's caption
  });

  it("counts down from the moment the prompt arrived", () => {
    setup(step());
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole("img", { name: "3 seconds left in this step" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("img", { name: "1 seconds left in this step" })).toBeInTheDocument();
  });

  it("replaces the step when the engine announces the next one, and restarts the countdown", () => {
    const { showing } = setup(step());
    act(() => vi.advanceTimersByTime(3000));
    showing(step({ step: 4, prompt: "Rest, hands down", gesture: null, receivedAt: Date.now() }));
    expect(screen.getByText("Step 4 of 47")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rest, hands down" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 seconds left in this step" })).toBeInTheDocument();
    expect(screen.queryByText("Three fingers")).not.toBeInTheDocument(); // no pose to show while resting
  });

  it("waits for the step's length when only the start response is known", () => {
    setup(step({ seconds: null, gesture: null }));
    expect(screen.getByRole("img", { name: "Waiting for the first step" })).toBeInTheDocument();
  });

  it("lets the person stop early, which keeps what was recorded", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const { onStop } = setup(step());
    await user.click(screen.getByRole("button", { name: "Stop and save" }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(screen.getByText("Stopping early keeps what was recorded so far.")).toBeInTheDocument();
  });

  it("finishes after the last step: the heading changes and Save session replaces Stop", () => {
    setup(step({ step: 47, prompt: "Swipe left", gesture: "SWIPE_LEFT", seconds: 2 }));
    expect(screen.queryByRole("button", { name: "Save session" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByRole("heading", { name: "Protocol finished" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save session" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop and save" })).not.toBeInTheDocument();
  });
});

describe("toPrompt", () => {
  it("turns the engine's recording_prompt event into the recorder's step", () => {
    const prompt = toPrompt(
      {
        kind: "recording_prompt",
        session_id: "rec-9",
        step: 1,
        total_steps: 3,
        prompt: "Show an open palm",
        gesture: "OPEN_PALM",
        seconds: 4,
      },
      1234,
    );
    expect(prompt).toEqual({
      sessionId: "rec-9",
      step: 1,
      totalSteps: 3,
      prompt: "Show an open palm",
      gesture: "OPEN_PALM",
      seconds: 4,
      receivedAt: 1234,
    });
  });
});
