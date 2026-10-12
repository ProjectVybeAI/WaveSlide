// How the engine's key names read as key caps: "shift+command+enter" is three caps.
const NAMES: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  esc: "Esc",
  escape: "Esc",
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
  shift: "⇧",
  command: "⌘",
  ctrl: "Ctrl",
  alt: "Alt",
  option: "⌥",
  home: "Home",
  space: "Space",
};

/** "shift+command+enter" becomes its three caps; a lone letter is upper-cased. */
export function keyCaps(key: string, slide?: number | null): string[] {
  return key.split("+").map((part) => {
    const lower = part.toLowerCase();
    if (part === "{n}") return slide ? String(slide) : "n";
    if (NAMES[lower]) return NAMES[lower];
    if (/^f\d{1,2}$/.test(lower)) return lower.toUpperCase();
    return part.length === 1 ? part.toUpperCase() : part;
  });
}
