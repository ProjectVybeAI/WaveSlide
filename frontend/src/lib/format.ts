// Number and time formatting for the UI (tabular figures are set in CSS).
const decimal1 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const formatFps = (fps: number) => `${decimal1.format(fps)} fps`;
export const formatMs = (ms: number) => `${whole.format(ms)} ms`;
export const formatClock = (unixSeconds: number) => clock.format(new Date(unixSeconds * 1000));
