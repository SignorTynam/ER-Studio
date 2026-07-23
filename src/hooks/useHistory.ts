import { useRef, useState } from "react";

export const DEFAULT_HISTORY_LIMIT = 100;

export interface UseHistoryOptions<T> {
  maxEntries?: number;
  clone?: (value: T) => T;
  isEqual?: (left: T, right: T) => boolean;
}

export function normalizeHistoryLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.max(0, Math.floor(value));
}

export function trimPastEntries<T>(entries: T[], maxEntries: number): T[] {
  if (maxEntries <= 0) {
    return [];
  }

  return entries.length > maxEntries ? entries.slice(entries.length - maxEntries) : entries;
}

export function trimFutureEntries<T>(entries: T[], maxEntries: number): T[] {
  if (maxEntries <= 0) {
    return [];
  }

  return entries.length > maxEntries ? entries.slice(0, maxEntries) : entries;
}

export function cloneHistoryValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function areHistoryValuesEqual<T>(
  left: T,
  right: T,
  isEqual?: (left: T, right: T) => boolean,
): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (isEqual) {
    return isEqual(left, right);
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export function useHistory<T>(initialValue: T, options: UseHistoryOptions<T> = {}) {
  const maxEntries = normalizeHistoryLimit(options.maxEntries ?? DEFAULT_HISTORY_LIMIT);
  const clone = options.clone ?? cloneHistoryValue;
  const isEqual = options.isEqual;
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresentState] = useState<T>(clone(initialValue));
  const [future, setFuture] = useState<T[]>([]);

  /**
   * `undo`/`redo` possono essere CATTURATI in una closure e invocati molti render dopo: è il caso
   * dell'azione "Annulla" di un toast, che viene creata nello stesso momento del commit e cliccata
   * secondi più tardi.
   *
   * Leggendo `past`/`present` dallo stato del render di cattura, l'undo ripristinava una baseline
   * vecchia: dopo un auto-layout, "Annulla" dal toast riportava al diagramma VUOTO invece che allo
   * stato pre-layout (mentre lo stesso undo dalla toolbar, che usa la closure corrente, funzionava).
   * Queste ref restano allineate all'ultimo valore, così l'azione agisce sempre sullo stato attuale
   * indipendentemente da quando è stata catturata.
   */
  const pastRef = useRef(past);
  const presentRef = useRef(present);
  const futureRef = useRef(future);
  pastRef.current = past;
  presentRef.current = present;
  futureRef.current = future;

  function setPresent(nextValue: T) {
    setPresentState(clone(nextValue));
  }

  function commit(nextValue: T, previousOverride?: T) {
    const previous = previousOverride ?? present;

    if (areHistoryValuesEqual(previous, nextValue, isEqual)) {
      setPresentState(clone(nextValue));
      return;
    }

    if (maxEntries === 0) {
      setPast([]);
      setFuture([]);
      setPresentState(clone(nextValue));
      return;
    }

    setPast((currentPast) => trimPastEntries([...currentPast, clone(previous)], maxEntries));
    setPresentState(clone(nextValue));
    setFuture([]);
  }

  function reset(nextValue: T) {
    setPast([]);
    setFuture([]);
    setPresentState(clone(nextValue));
  }

  function undo() {
    const currentPast = pastRef.current;
    if (maxEntries === 0 || currentPast.length === 0) {
      return;
    }

    const previous = currentPast[currentPast.length - 1];
    const currentPresent = presentRef.current;
    const nextPast = currentPast.slice(0, -1);
    const nextFuture = trimFutureEntries([clone(currentPresent), ...futureRef.current], maxEntries);

    // Aggiorniamo subito anche le ref: due undo consecutivi prima di un re-render devono
    // avanzare nella storia invece di ripetere lo stesso passo.
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    presentRef.current = previous;

    setPast(nextPast);
    setFuture(nextFuture);
    setPresentState(clone(previous));
  }

  function redo() {
    const currentFuture = futureRef.current;
    if (maxEntries === 0 || currentFuture.length === 0) {
      return;
    }

    const [next, ...remaining] = currentFuture;
    const currentPresent = presentRef.current;
    const nextPast = trimPastEntries([...pastRef.current, clone(currentPresent)], maxEntries);

    pastRef.current = nextPast;
    futureRef.current = remaining;
    presentRef.current = next;

    setFuture(remaining);
    setPast(nextPast);
    setPresentState(clone(next));
  }

  return {
    past,
    present,
    future,
    canUndo: maxEntries > 0 && past.length > 0,
    canRedo: maxEntries > 0 && future.length > 0,
    setPresent,
    commit,
    reset,
    undo,
    redo,
    pastCount: past.length,
    futureCount: future.length,
    historyLimit: maxEntries,
  };
}
