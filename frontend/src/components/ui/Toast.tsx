// ToastProvider: notices in the corner, announced politely by one always-present live region.
// Each toast closes itself after a while, but the timer pauses while the pointer is over it or
// focus is inside it, so nobody loses a message they are reading (WCAG 2.2.1). Danger toasts
// stay until dismissed. At most three are shown; the oldest goes first.
import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { ToastContext, type ToastApi, type ToastInput, type ToastTone } from "./toastContext";
import styles from "./Toast.module.css";

type ToastItem = ToastInput & { id: number };

const ICONS: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};
const MAX_VISIBLE = 3;

export function ToastProvider({ children, duration = 6000 }: { children: ReactNode; duration?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((toast) => toast.id !== id)), []);
  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((all) => [...all, { ...toast, id }].slice(-MAX_VISIBLE));
    return id;
  }, []);
  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Always rendered: a live region must exist before its content changes to be announced. */}
      <section className={styles.region} aria-label="Notifications" aria-live="polite" role="status">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            duration={toast.tone === "danger" ? null : duration}
            onDismiss={dismiss}
          />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

type ToastProps = { toast: ToastItem; duration: number | null; onDismiss: (id: number) => void };

function Toast({ toast, duration, onDismiss }: ToastProps) {
  const tone = toast.tone ?? "info";
  const Icon = ICONS[tone];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(duration ?? 0);

  // Count down only while nobody is looking at it; keep what is left when paused.
  useEffect(() => {
    if (duration === null || hovered || focused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [duration, hovered, focused, onDismiss, toast.id]);

  return (
    <div
      className={clsx(styles.toast, styles[tone])}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        <p className={styles.title}>{toast.title}</p>
        {toast.description ? <p className={styles.description}>{toast.description}</p> : null}
        {toast.action ? <div className={styles.action}>{toast.action}</div> : null}
      </div>
      <IconButton icon={X} label="Dismiss notification" size="sm" className={styles.close} onClick={() => onDismiss(toast.id)} />
    </div>
  );
}
