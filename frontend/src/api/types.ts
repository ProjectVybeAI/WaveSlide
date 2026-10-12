// Friendly names for the generated contract types (src/api/schema.d.ts, from backend/openapi.json).
import type { components } from "./schema";

type S = components["schemas"];

export type Health = S["Health"];
export type EngineSnapshot = S["EngineSnapshot"];
export type EngineFrame = S["EngineFrame"];
export type EngineEventMessage = S["EngineEventMessage"];
export type EngineEvent = EngineEventMessage["event"];
export type ServerMessage = S["ServerMessage"];
export type ClientMessage = S["ClientMessage"];
export type HandLandmarks = S["HandLandmarks"];
export type HoldInfo = S["HoldInfo"];
export type CommandLogEntry = S["CommandLogEntry"];
export type Settings = S["Settings"];
export type AppProfile = S["AppProfile"];
export type CameraInfo = S["CameraInfo"];
export type SessionSummary = S["SessionSummary"];
export type ModelCard = S["ModelCard"];
export type EvaluationReport = S["EvaluationReport"];
export type EvaluationSummary = S["EvaluationSummary"];
export type Job = S["Job"];
export type ErrorCode = S["ErrorCode"];
