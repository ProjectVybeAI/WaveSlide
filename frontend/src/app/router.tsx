// The route table: the one place routes are registered.
import { createBrowserRouter } from "react-router";
import { DatasetPage } from "@/features/dataset/DatasetPage";
import { EvaluationPage } from "@/features/evaluation/EvaluationPage";
import { LivePage } from "@/features/live/LivePage";
import { OverlayPage } from "@/features/overlay/OverlayPage";
import { PracticePage } from "@/features/practice/PracticePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { Layout } from "./Layout";
import { NotFoundPage } from "./NotFoundPage";
import { OverlayLayout } from "./OverlayLayout";
import { RouteError } from "./RouteError";

export const router = createBrowserRouter([
  {
    path: "/overlay",
    element: <OverlayLayout />,
    errorElement: <RouteError />,
    children: [{ index: true, element: <OverlayPage /> }],
  },
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LivePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "practice", element: <PracticePage /> },
      { path: "dataset", element: <DatasetPage /> },
      { path: "evaluation", element: <EvaluationPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
