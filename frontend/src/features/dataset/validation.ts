// Checks for the Record session form. A message names what to change, not just that something is wrong.

/** The participant code: required, up to 40 characters. Returns the message to show, or undefined if fine. */
export function validateParticipant(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0) return "Enter a participant code, for example p4.";
  if (name.length > 40) return "Use 40 characters or fewer.";
  return undefined;
}
