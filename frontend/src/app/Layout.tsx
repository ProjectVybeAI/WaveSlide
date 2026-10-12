// Settings-window shell: sidebar (wordmark, tally block, navigation, engine facts) and the page.
import { Activity, Database, FlaskConical, Presentation, SlidersHorizontal } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useEngineFrame } from "@/api/engineSocket";
import { useEngineSnapshot } from "@/api/queries";
import { TallyBlock } from "@/components/shell/TallyBlock";
import { Wordmark } from "@/components/shell/Wordmark";
import { formatFps, formatMs } from "@/lib/format";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/", label: "Live", icon: Activity, end: true },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal },
  { to: "/practice", label: "Practice deck", icon: Presentation },
  { to: "/dataset", label: "Dataset", icon: Database },
  { to: "/evaluation", label: "Evaluation lab", icon: FlaskConical },
];

const PROFILE_NAMES: Record<string, string> = {
  powerpoint: "PowerPoint",
  google_slides: "Google Slides",
  pdf_viewer: "PDF viewer",
  practice: "Practice deck",
};

export function Layout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <aside className={styles.side}>
        <Wordmark />
        <TallyBlock />
        <nav aria-label="Main">
          <ul className={styles.nav}>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} viewTransition>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <EngineFacts />
      </aside>
      <div className={styles.page} id="main">
        <Outlet />
      </div>
    </div>
  );
}

function EngineFacts() {
  const { data } = useEngineSnapshot();
  const frame = useEngineFrame();
  const fps = frame?.fps ?? data?.fps;
  return (
    <dl className={styles.facts}>
      <div>
        <dt>App profile</dt>
        <dd>{data ? (PROFILE_NAMES[data.profile_id] ?? data.profile_id) : "–"}</dd>
      </div>
      <div>
        <dt>Recogniser</dt>
        <dd>{data ? (data.recogniser === "ml" ? "Trained model" : "Rules") : "–"}</dd>
      </div>
      <div>
        <dt>{data?.source === "replay" ? "Replay" : "Camera"}</dt>
        <dd>{fps ? formatFps(fps) : "–"}</dd>
      </div>
      <div>
        <dt>Capture to key, p50</dt>
        <dd>{data?.pipeline_ms_p50 ? formatMs(data.pipeline_ms_p50) : "–"}</dd>
      </div>
    </dl>
  );
}
