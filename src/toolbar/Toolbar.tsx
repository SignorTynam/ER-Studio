import type { EditorMode, ToolKind } from "../types/diagram";
import { TOOL_DEFINITIONS } from "../utils/toolConfig";

interface ToolbarProps {
  activeTool: ToolKind;
  mode: EditorMode;
  onToolChange: (tool: ToolKind) => void;
}

function ToolIcon({ tool }: { tool: ToolKind }) {
  if (tool === "move") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 3l2.6 2.6H13v3h-2v-3H9.4L12 3zm0 18l-2.6-2.6H11v-3h2v3h1.6L12 21zM3 12l2.6-2.6V11h3v2h-3v1.6L3 12zm18 0l-2.6 2.6V13h-3v-2h3V9.4L21 12z" fill="currentColor" />
      </svg>
    );
  }

  if (tool === "entity") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "relationship") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "attribute") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <circle cx="8" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <line x1="11.5" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "connector") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M4 8h7v8h9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "inheritance") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M12 19V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 11L12 7l3.5 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tool === "text") {
    return (
      <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
        <path d="M6 6h12M12 6v12" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="tool-icon" aria-hidden="true">
      <path d="M5 5l7 14 2-6 6-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function Toolbar(props: ToolbarProps) {
  return (
    <aside className="toolbar-panel">
      <div className="panel-heading">Strumenti</div>
      <div className="toolbar-list">
        {TOOL_DEFINITIONS.map((item) => {
          const disabled = props.mode === "view" && item.tool !== "select" && item.tool !== "move";
          return (
            <button
              key={item.tool}
              type="button"
              className={props.activeTool === item.tool ? "tool-button active" : "tool-button"}
              onClick={() => props.onToolChange(item.tool)}
              disabled={disabled}
              title={`${item.label} (${item.shortcut.toUpperCase()})`}
            >
              <ToolIcon tool={item.tool} />
              <span>{item.label}</span>
              <span className="tool-shortcut">{item.shortcut.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

