// The overlay window has no chrome: the page is the window (340 x 280, or 220 x 56 compact).
import { Outlet } from "react-router";
import styles from "./OverlayLayout.module.css";

export function OverlayLayout() {
  return (
    <main className={styles.window}>
      <Outlet />
    </main>
  );
}
