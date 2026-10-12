// Contract types the hand components and the feature screens share (src/api/types.ts is not ours to extend).
import type { components } from "@/api/schema";

export type Action = components["schemas"]["Action"];
export type Gesture = components["schemas"]["Gesture"];
export type Pose = components["schemas"]["Pose"];
export type ProfileId = components["schemas"]["Settings"]["profile_id"];
