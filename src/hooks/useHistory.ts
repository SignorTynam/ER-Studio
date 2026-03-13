import { useState } from "react";

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isEqual<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useHistory<T>(initialValue: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresentState] = useState<T>(cloneValue(initialValue));
  const [future, setFuture] = useState<T[]>([]);

  function setPresent(nextValue: T) {
    setPresentState(cloneValue(nextValue));
  }

  function commit(nextValue: T, previousOverride?: T) {
    const previous = previousOverride ?? present;

    if (isEqual(previous, nextValue)) {
      setPresentState(cloneValue(nextValue));
      return;
    }

    setPast((currentPast) => [...currentPast, cloneValue(previous)]);
    setPresentState(cloneValue(nextValue));
    setFuture([]);
  }

  function reset(nextValue: T) {
    setPast([]);
    setFuture([]);
    setPresentState(cloneValue(nextValue));
  }

  function undo() {
    if (past.length === 0) {
      return;
    }

    const previous = past[past.length - 1];
    setPast((currentPast) => currentPast.slice(0, -1));
    setFuture((currentFuture) => [cloneValue(present), ...currentFuture]);
    setPresentState(cloneValue(previous));
  }

  function redo() {
    if (future.length === 0) {
      return;
    }

    const [next, ...remaining] = future;
    setFuture(remaining);
    setPast((currentPast) => [...currentPast, cloneValue(present)]);
    setPresentState(cloneValue(next));
  }

  return {
    past,
    present,
    future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    setPresent,
    commit,
    reset,
    undo,
    redo,
  };
}
