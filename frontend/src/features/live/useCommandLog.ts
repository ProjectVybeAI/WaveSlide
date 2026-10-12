// The session's command log: every command event in order, newest first, kept in memory.
// Blocked commands stay in it with their reason. Seeded with the engine's last command so a
// freshly opened window is not empty while the engine has already sent something.
import { useCallback, useMemo, useState } from "react";
import { useEngineEvents } from "@/api/engineSocket";
import type { CommandLogEntry, EngineEvent } from "@/api/types";

const MAX_ENTRIES = 200;

export function useCommandLog(seed: CommandLogEntry | null | undefined): CommandLogEntry[] {
  const [entries, setEntries] = useState<CommandLogEntry[]>([]);
  const onEvent = useCallback((event: EngineEvent) => {
    if (event.kind !== "command") return;
    setEntries((previous) =>
      [event.command, ...previous.filter((entry) => entry.id !== event.command.id)].slice(0, MAX_ENTRIES),
    );
  }, []);
  useEngineEvents(onEvent);

  return useMemo(() => {
    if (!seed || entries.some((entry) => entry.id === seed.id)) return entries;
    return [...entries, seed].sort((a, b) => b.id - a.id);
  }, [entries, seed]);
}
