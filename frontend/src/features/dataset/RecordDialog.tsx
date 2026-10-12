// "Record session": which protocol, who, how far from the camera and in what light. The engine
// starts the guided recorder on submit; this dialog stays open, with the answers kept, if it cannot.
import { Circle } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { ApiError } from "@/api/errors";
import { Button, Callout, Dialog, DialogClose, Field, Input, Select } from "@/components/ui";
import type { RecordingRequest } from "./api";
import { LIGHTING_LABEL } from "./labels";
import { validateParticipant } from "./validation";
import styles from "./RecordDialog.module.css";

type Protocol = RecordingRequest["protocol"];
type Lighting = RecordingRequest["lighting"];

const PROTOCOLS: Array<{ value: Protocol; label: string; help: string }> = [
  {
    value: "gestures",
    label: "Gestures",
    help: "Each pose three times, then swipes each way, with rests in between. This is what the evaluation scores.",
  },
  {
    value: "talking",
    label: "Talking, 3 minutes",
    help: "Talk about anything with your hands moving, as you would in a lecture. Measures false triggers.",
  },
  {
    value: "two_hand",
    label: "Two hands",
    help: "Slides 6 to 10: one hand shows five, the other one to five.",
  },
];
const DISTANCES = ["0.5", "1", "1.5", "2"];

export type RecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The engine is replaying a session, so there is no camera to record from. */
  replaying: boolean;
  /** Participants already in the dataset, offered as suggestions so a person is spelled the same each time. */
  participants: string[];
  /** Starts the recorder. Rejects with an ApiError when the engine says no. */
  onStart: (request: RecordingRequest) => Promise<unknown>;
};

/** What the engine's refusal means for this person, in one sentence. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "CAMERA_REQUIRED") {
    return "Recording needs the webcam, and WaveSlide is replaying a session. Switch to the camera on Live, then try again.";
  }
  if (error instanceof ApiError && error.code === "RECORDING_IN_PROGRESS") {
    return "A recording is already running. Stop it before you start another.";
  }
  return error instanceof ApiError
    ? error.message
    : "WaveSlide cannot reach its engine. Try again in a moment.";
}

export function RecordDialog({ open, onOpenChange, replaying, participants, onStart }: RecordDialogProps) {
  const formId = useId();
  const listId = useId();
  const [protocol, setProtocol] = useState<Protocol>("gestures");
  const [participant, setParticipant] = useState("");
  const [distance, setDistance] = useState("1");
  const [lighting, setLighting] = useState<Lighting>("normal");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const participantError = touched ? validateParticipant(participant) : undefined;
  const chosen = PROTOCOLS.find((p) => p.value === protocol);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (validateParticipant(participant) || replaying) return;
    setPending(true);
    setFailure(null);
    try {
      await onStart({ protocol, participant: participant.trim(), distance_m: Number(distance), lighting });
    } catch (error) {
      setFailure(failureMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Record a session"
      description="Stand where you would present. WaveSlide saves hand landmarks only, never video."
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={Circle}
            pending={pending}
            pendingLabel="Starting"
            disabled={replaying}
          >
            Start recording
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
        {replaying ? (
          <Callout tone="warning" title="No camera while replaying">
            Recording needs the webcam. Switch the source to the camera on Live first.
          </Callout>
        ) : null}
        {failure ? (
          <Callout tone="danger" title="Recording did not start" role="alert">
            {failure}
          </Callout>
        ) : null}
        <Field label="Protocol" help={chosen?.help}>
          <Select
            value={protocol}
            onValueChange={(value) => setProtocol(value as Protocol)}
            options={PROTOCOLS.map(({ value, label }) => ({ value, label }))}
          />
        </Field>
        <Field
          label="Participant"
          help="A short code such as p4. Use a code, not a name."
          error={participantError}
          required
        >
          <Input
            value={participant}
            onChange={(event) => setParticipant(event.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={40}
            list={listId}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
        <datalist id={listId}>
          {participants.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className={styles.pair}>
          <Field label="Distance from the camera">
            <Select
              value={distance}
              onValueChange={setDistance}
              options={DISTANCES.map((value) => ({ value, label: `${value} m` }))}
            />
          </Field>
          <Field label="Lighting">
            <Select
              value={lighting}
              onValueChange={(value) => setLighting(value as Lighting)}
              options={(Object.keys(LIGHTING_LABEL) as Lighting[]).map((value) => ({
                value,
                label: LIGHTING_LABEL[value],
              }))}
            />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
