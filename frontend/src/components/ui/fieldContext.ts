// Shares a Field's ids with the control inside it (Input, Textarea, Select), so the label,
// help text and error are linked without passing ids by hand.
import { createContext, useContext } from "react";

export type FieldIds = {
  controlId: string;
  helpId: string | undefined;
  errorId: string | undefined;
  invalid: boolean;
  required: boolean;
};

export const FieldContext = createContext<FieldIds | null>(null);

/** id, aria-describedby, aria-invalid and required for the control inside a Field. */
export function useFieldControl(own: { id?: string | undefined; "aria-describedby"?: string | undefined } = {}) {
  const field = useContext(FieldContext);
  const describedBy = [own["aria-describedby"], field?.helpId, field?.errorId].filter(Boolean).join(" ");
  return {
    id: own.id ?? field?.controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": field?.invalid ? (true as const) : undefined,
    required: field?.required || undefined,
  };
}
