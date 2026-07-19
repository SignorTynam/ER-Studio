import { useEffect, useRef, type PointerEvent } from "react";
import { useI18n } from "../../i18n/useI18n";

interface SqlPlaygroundSplitterProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function SqlPlaygroundSplitter({ value, min, max, onChange, onReset }: SqlPlaygroundSplitterProps) {
  const { t } = useI18n();
  const dragRef = useRef<{ pointerId: number; startY: number; startValue: number; userSelect: string; cursor: string; element: HTMLDivElement } | null>(null);

  function restoreDocumentStyles(): void {
    const drag = dragRef.current;
    if (!drag || typeof document === "undefined") return;
    document.body.style.userSelect = drag.userSelect;
    document.body.style.cursor = drag.cursor;
    drag.element.classList.remove("is-active");
    dragRef.current = null;
  }

  useEffect(() => restoreDocumentStyles, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: value,
      userSelect: document.body.style.userSelect,
      cursor: document.body.style.cursor,
      element: event.currentTarget,
    };
    event.currentTarget.classList.add("is-active");
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
  }

  return (
    <div
      className="sql-playground-splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("sqlPlayground.results.resize")}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(clamp(value, min, max))}
      tabIndex={0}
      onDoubleClick={onReset}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        onChange(clamp(drag.startValue + drag.startY - event.clientY, min, max));
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        restoreDocumentStyles();
      }}
      onPointerCancel={restoreDocumentStyles}
      onLostPointerCapture={restoreDocumentStyles}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? 1 : -1;
        onChange(clamp(value + direction * (event.shiftKey ? 24 : 8), min, max));
      }}
    />
  );
}
