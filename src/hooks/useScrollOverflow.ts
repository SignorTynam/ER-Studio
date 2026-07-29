import { useCallback, useEffect, useRef, useState } from "react";

export interface ScrollOverflow {
  /** C'e contenuto oltre il bordo iniziale (sinistro in LTR). */
  atStart: boolean;
  /** C'e contenuto oltre il bordo finale (destro in LTR). */
  atEnd: boolean;
}

/**
 * Osserva quanto contenuto resta fuori da un contenitore scrollabile in
 * orizzontale.
 *
 * Serve per dare un'indicazione visibile che lo scroll esiste: un contenitore
 * che scorre senza alcun segnale sembra semplicemente troncato, e i controlli
 * oltre il bordo restano di fatto invisibili. Lo stato si aggiorna su scroll,
 * su resize del contenitore e quando cambia il numero di figli, cosi la
 * sfumatura sparisce appena il contenuto ci sta tutto.
 *
 * La logica ricalca quella gia usata da `ProjectFileTabs` per le sue frecce di
 * scorrimento; qui e estratta per poter essere condivisa.
 */
export function useScrollOverflow<T extends HTMLElement>(): [
  React.RefObject<T>,
  ScrollOverflow,
] {
  const ref = useRef<T>(null);
  const [overflow, setOverflow] = useState<ScrollOverflow>({ atStart: false, atEnd: false });

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const maxScroll = element.scrollWidth - element.clientWidth;
    // Sotto il pixel le differenze sono arrotondamenti di layout, non contenuto.
    const scrollLeft = Math.abs(element.scrollLeft);
    setOverflow((current) => {
      const next = { atStart: scrollLeft > 1, atEnd: maxScroll - scrollLeft > 1 };
      return current.atStart === next.atStart && current.atEnd === next.atEnd ? current : next;
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    update();
    element.addEventListener("scroll", update, { passive: true });

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    // I comandi della toolbar cambiano con la selezione: senza osservare i
    // figli la sfumatura resterebbe ferma allo stato precedente.
    const mutations = typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    mutations?.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [update]);

  return [ref, overflow];
}
