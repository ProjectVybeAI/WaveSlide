// The "Record session" form: a participant is required (checked on blur), the answers go to the
// engine as the contract's RecordingRequest, and a refusal stays inside the dialog with the input kept.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/api/errors";
import { RecordDialog } from "./RecordDialog";
import { validateParticipant } from "./validation";

function setup(props: { replaying?: boolean; onStart?: () => Promise<unknown> } = {}) {
  const onStart = vi.fn(props.onStart ?? (() => Promise.resolve()));
  const onOpenChange = vi.fn();
  render(
    <RecordDialog
      open
      onOpenChange={onOpenChange}
      replaying={props.replaying ?? false}
      participants={["p1", "p2"]}
      onStart={onStart}
    />,
  );
  return { onStart, onOpenChange, user: userEvent.setup() };
}

describe("RecordDialog", () => {
  it("asks for a participant code when the field is left empty", async () => {
    const { user, onStart } = setup();
    const participant = screen.getByLabelText(/Participant/);
    await user.click(participant);
    await user.tab();
    expect(await screen.findByText("Enter a participant code, for example p4.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    expect(onStart).not.toHaveBeenCalled();
  });

  it("starts the recorder with what was entered", async () => {
    const { user, onStart } = setup();
    await user.type(screen.getByLabelText(/Participant/), "  p4 ");
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    expect(onStart).toHaveBeenCalledWith({
      protocol: "gestures",
      participant: "p4",
      distance_m: 1,
      lighting: "normal",
    });
  });

  it("keeps the dialog open and the input in place when the engine refuses", async () => {
    const { user } = setup({
      onStart: () => Promise.reject(new ApiError("CAMERA_REQUIRED", "Recording needs the camera.", 409)),
    });
    await user.type(screen.getByLabelText(/Participant/), "p4");
    await user.click(screen.getByRole("button", { name: "Start recording" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Recording needs the webcam, and WaveSlide is replaying a session.");
    expect(screen.getByLabelText(/Participant/)).toHaveValue("p4");
    expect(screen.getByRole("button", { name: "Start recording" })).toBeEnabled();
  });

  it("explains why it cannot record while replaying a session", () => {
    setup({ replaying: true });
    expect(screen.getByText("No camera while replaying")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start recording" })).toBeDisabled();
  });
});

describe("validateParticipant", () => {
  it("accepts a short code and rejects an empty or very long one", () => {
    expect(validateParticipant("p4")).toBeUndefined();
    expect(validateParticipant("   ")).toMatch(/participant code/);
    expect(validateParticipant("x".repeat(41))).toMatch(/40 characters/);
  });
});
