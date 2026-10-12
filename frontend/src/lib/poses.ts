// Words for poses and actions, as DESIGN.md "Copy" sets them.
import type { components } from "@/api/schema";

type Pose = components["schemas"]["Pose"];

export const POSE_LABEL: Record<Pose, string> = {
  NONE: "No pose",
  FIST: "Fist",
  OPEN_PALM: "Open palm",
  THUMBS_UP: "Thumbs up",
  THUMBS_DOWN: "Thumbs down",
  COUNT_1: "One finger",
  COUNT_2: "Two fingers",
  COUNT_3: "Three fingers",
  COUNT_4: "Four fingers",
  COUNT_5: "Five fingers",
};
