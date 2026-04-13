interface CodePanelProps {
  code: string;
  placeholder?: string;
}

export function CodePanel(props: CodePanelProps) {
  const hasCode = props.code.trim().length > 0;

  return (
    <aside className="diagram-code-panel" aria-label="Codice del diagramma ER">
      <header className="diagram-code-panel-head">
        <h2>Codice del diagramma</h2>
        <span>Read only</span>
      </header>

      {hasCode ? (
        <pre className="diagram-code-panel-content">{props.code}</pre>
      ) : (
        <div className="diagram-code-panel-placeholder">{props.placeholder ?? "Nessun codice disponibile"}</div>
      )}
    </aside>
  );
}
