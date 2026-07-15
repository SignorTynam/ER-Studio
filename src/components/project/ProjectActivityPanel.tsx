import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { StudioIcon, type StudioIconName } from "../icons/StudioIcon";
import { Tooltip } from "../ui";

export type ProjectActivityId = "file" | "code" | "reverse" | "errors" | "version" | "export";

export interface ProjectActivityItem {
  id: ProjectActivityId;
  label: string;
  icon: StudioIconName;
  badge?: number;
  shortcut?: string;
}

interface ProjectActivityPanelProps {
  items: ProjectActivityItem[];
  activeId: ProjectActivityId;
  open: boolean;
  width: number;
  title: string;
  closeLabel: string;
  openLabel: string;
  commandMenuLabel: string;
  keyboardShortcutsLabel: string;
  onSelect: (id: ProjectActivityId) => void;
  onToggleOpen: () => void;
  onOpenCommandMenu: () => void;
  onOpenShortcuts: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeBy?: (delta: number) => void;
  children: ReactNode;
}

function formatActivityBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function ProjectActivityPanel(props: ProjectActivityPanelProps) {
  return (
    <aside
      className={props.open ? "project-activity-panel" : "project-activity-panel project-activity-panel--collapsed"}
      style={{ "--project-explorer-width": `${props.width}px` } as CSSProperties}
      aria-label={props.title}
    >
      <nav className="project-activity-rail" aria-label={props.title}>
        {props.items.map((item) => (
          <Tooltip
            key={item.id}
            position="right"
            label={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
          >
            <button
              type="button"
              className={item.id === props.activeId && props.open ? "project-activity-button active" : "project-activity-button"}
              onClick={() => props.onSelect(item.id)}
              aria-label={item.label}
              aria-pressed={item.id === props.activeId && props.open}
            >
              <StudioIcon name={item.icon} aria-hidden="true" />
              {typeof item.badge === "number" && item.badge > 0 ? (
                <span className="project-activity-badge" aria-label={`${item.badge}`}>{formatActivityBadge(item.badge)}</span>
              ) : null}
            </button>
          </Tooltip>
        ))}
        <div className="project-activity-rail__bottom">
          <Tooltip position="right" label={props.commandMenuLabel}>
            <button
              type="button"
              className="project-activity-button"
              onClick={props.onOpenCommandMenu}
              aria-label={props.commandMenuLabel}
            >
              <StudioIcon name="menu" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip position="right" label={props.keyboardShortcutsLabel}>
            <button
              type="button"
              className="project-activity-button"
              onClick={props.onOpenShortcuts}
              aria-label={props.keyboardShortcutsLabel}
            >
              <StudioIcon name="keyboard" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </nav>

      {props.open ? <div className="project-activity-content">{props.children}</div> : null}

      {props.open ? (
        <div
          className="project-explorer-resizer"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={props.title}
          aria-valuemin={220}
          aria-valuemax={420}
          aria-valuenow={props.width}
          onPointerDown={props.onResizeStart}
          onKeyDown={(event) => {
            if (!props.onResizeBy || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
              return;
            }
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 1 : -1;
            props.onResizeBy(direction * (event.shiftKey ? 24 : 8));
          }}
        />
      ) : null}
    </aside>
  );
}
