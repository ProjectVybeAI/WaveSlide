import { useEffect } from "react";

/** Sets the window title: "Settings · WaveSlide". */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · WaveSlide` : "WaveSlide";
  }, [title]);
}
