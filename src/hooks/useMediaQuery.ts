import { useCallback, useSyncExternalStore } from "react";

/**
 * Sottoscrive una media query CSS.
 *
 * Serve quando un comportamento (non solo l'aspetto) cambia a un breakpoint:
 * sotto i 900px il pannello workspace diventa un drawer modale e deve
 * rispondere a Esc, mentre sopra resta una colonna fissa e non deve
 * intercettare nulla. Il breakpoint resta dichiarato una volta sola nel CSS
 * e viene letto da qui, senza duplicare soglie in JavaScript.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }

      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
