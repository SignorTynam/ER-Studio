interface NotesPanelProps {
  notes: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export function NotesPanel(props: NotesPanelProps) {
  const isReadOnly = !props.editable || !props.onChange;

  return (
    <aside className="diagram-notes-panel" aria-label="Note del diagramma">
      <header className="diagram-notes-panel-head">
        <h2>Notes</h2>
        <span>{isReadOnly ? "Read only" : "Modifica"}</span>
      </header>

      <textarea
        className="diagram-notes-editor"
        value={props.notes}
        onChange={(event) => props.onChange?.(event.target.value)}
        placeholder="Aggiungi qui note, decisioni progettuali e promemoria del diagramma"
        readOnly={isReadOnly}
        spellCheck={false}
        aria-label="Editor note"
      />
    </aside>
  );
}
