// One WebSocket to the engine (/ws/engine), shared by every component.
// Frames: components read only the latest one (useEngineFrame). Events: delivered in order to
// listeners (useEngineEvents). Reconnects with backoff; tells the engine which window this is and
// whether it has keyboard focus (the engine holds keys back while a WaveSlide window is focused).
import { useEffect, useSyncExternalStore } from "react";
import type { ClientMessage, EngineEvent, EngineFrame, ServerMessage } from "./types";

export type SocketStatus = "connecting" | "open" | "closed";
type EventListener = (event: EngineEvent) => void;

const MAX_BACKOFF_MS = 5000;

class EngineSocket {
  private socket: WebSocket | null = null;
  private frame: EngineFrame | null = null;
  private status: SocketStatus = "closed";
  private storeListeners = new Set<() => void>();
  private eventListeners = new Set<EventListener>();
  private backoff = 500;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private started = false;

  /** Opens the connection on first use; later calls do nothing. */
  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    window.addEventListener("focus", this.sendFocus);
    window.addEventListener("blur", this.sendFocus);
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/engine`);
    this.socket = socket;
    this.setStatus("connecting");
    socket.onopen = () => {
      this.backoff = 500;
      this.setStatus("open");
      const role = window.location.pathname.startsWith("/overlay") ? "overlay" : "settings";
      this.send({ type: "hello", role });
      this.sendFocus();
    };
    socket.onmessage = (message) => this.receive(message.data);
    socket.onclose = () => {
      this.socket = null;
      this.setStatus("closed");
      this.retryTimer = setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    };
  }

  private receive(raw: unknown) {
    if (typeof raw !== "string") return;
    const message = JSON.parse(raw) as ServerMessage;
    if (message.type === "frame") {
      this.frame = message;
      this.notify();
    } else {
      for (const listener of this.eventListeners) listener(message.event);
    }
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private sendFocus = () => {
    this.send({ type: "focus", has_focus: document.hasFocus(), route: window.location.pathname });
  };

  private setStatus(status: SocketStatus) {
    this.status = status;
    this.notify();
  }

  private notify() {
    for (const listener of this.storeListeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.start();
    this.storeListeners.add(listener);
    return () => this.storeListeners.delete(listener);
  };

  onEvent(listener: EventListener) {
    this.start();
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  getFrame = () => this.frame;
  getStatus = () => this.status;

  /** Tests only: forget the connection. */
  reset() {
    clearTimeout(this.retryTimer);
    this.socket?.close();
    this.frame = null;
    this.started = false;
  }
}

export const engineSocket = new EngineSocket();

/** The latest engine frame (re-renders at most at the engine's frame rate). */
export function useEngineFrame(): EngineFrame | null {
  return useSyncExternalStore(engineSocket.subscribe, engineSocket.getFrame, () => null);
}

export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(engineSocket.subscribe, engineSocket.getStatus, () => "closed");
}

/** Calls `listener` for every engine event, in order. Keep the listener stable (useCallback). */
export function useEngineEvents(listener: EventListener) {
  useEffect(() => engineSocket.onEvent(listener), [listener]);
}
