import "@fontsource-variable/sofia-sans";
import "@fontsource-variable/sofia-sans-extra-condensed";
import "@fontsource-variable/red-hat-mono";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";

/** Mocks run only when asked: ?state=... in the URL, or VITE_MOCKS=1. The real engine otherwise. */
async function startMocks() {
  const wanted = new URLSearchParams(window.location.search).has("state") || import.meta.env.VITE_MOCKS === "1";
  if (!import.meta.env.DEV || !wanted) return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ quiet: true });
}

void startMocks().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
