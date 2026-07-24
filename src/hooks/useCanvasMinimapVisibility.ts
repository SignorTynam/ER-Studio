import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_CANVAS_MINIMAP_VISIBILITY_KEY,
  readCanvasMinimapVisibility,
  writeCanvasMinimapVisibility,
} from "../canvas/CanvasMinimap";

/**
 * Sorgente reattiva condivisa per la visibilità della minimap, indicizzata per chiave
 * (una per vista: ER, logico, traduzione).
 *
 * Perché esiste: la visibilità viveva come stato locale in `DiagramCanvas`. Per far sì che
 * il toggle sul canvas e la nuova schermata Impostazioni restino sincronizzati — "cambiando
 * in un posto cambia anche nell'altro" — senza sollevare lo stato fino ad `App`, entrambi
 * leggono/scrivono questa cache in-memory, allineata a `localStorage` tramite gli helper
 * esistenti (`read/writeCanvasMinimapVisibility`). Persistenza e default responsive restano
 * invariati: la cache si inizializza dalla lettura esistente.
 */
const listeners = new Set<() => void>();
const cache = new Map<string, boolean>();

function readValue(key: string): boolean {
  if (!cache.has(key)) {
    cache.set(key, readCanvasMinimapVisibility(key));
  }
  return cache.get(key) as boolean;
}

/** Scrive la visibilità (localStorage + cache) e notifica tutti i sottoscrittori. */
export function setCanvasMinimapVisibility(key: string, visible: boolean): void {
  if (cache.get(key) === visible) {
    return;
  }
  cache.set(key, visible);
  writeCanvasMinimapVisibility(key, visible);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Legge/scrive la visibilità della minimap per una data chiave (default: vista ER).
 * L'API rispecchia `useState`: `[visible, setVisible]`.
 */
export function useCanvasMinimapVisibility(
  key: string = DEFAULT_CANVAS_MINIMAP_VISIBILITY_KEY,
): [boolean, (visible: boolean) => void] {
  const visible = useSyncExternalStore(
    subscribe,
    useCallback(() => readValue(key), [key]),
    () => true,
  );
  const setVisible = useCallback((next: boolean) => setCanvasMinimapVisibility(key, next), [key]);
  return [visible, setVisible];
}
