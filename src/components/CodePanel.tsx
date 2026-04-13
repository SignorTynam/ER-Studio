interface CodePanelProps {
  code: string;
  placeholder?: string;
  editable?: boolean;
  parseError?: string;
  onCodeChange?: (value: string) => void;
}

export function CodePanel(props: CodePanelProps) {
  const isReadOnly = !props.editable || !props.onCodeChange;

  return (
    <aside className="diagram-code-panel" aria-label="Codice del diagramma ER">
      <header className="diagram-code-panel-head">
        <h2>Codice del programma</h2>
        <span className={props.parseError ? "code-panel-status error" : "code-panel-status"}>
          {props.parseError ? "Errore" : isReadOnly ? "Read only" : "Write"}
        </span>
      </header>

      <textarea
        className="diagram-code-panel-content"
        value={props.code}
        onChange={(event) => props.onCodeChange?.(event.target.value)}
        placeholder={props.placeholder ?? "Nessun codice disponibile"}
        spellCheck={false}
        readOnly={isReadOnly}
        aria-label="Editor codice del programma"
      />
    </aside>
  );
}
