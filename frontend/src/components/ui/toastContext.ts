// useToast(): show a short notice for a background or global event ("Export ready",
// "Connection restored"). Results of the person's own action stay inline, next to it.
import { createContext, useContext, type ReactNode } from "react";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type ToastInput = {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** A button inside the toast, e.g. <Button size="sm" onClick={undo}>Undo</Button>. */
  action?: ReactNode;
};

export type ToastApi = {
  /** Shows a toast and returns its id. */
  show: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
