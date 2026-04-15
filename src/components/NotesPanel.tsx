import { useI18n } from "../i18n/useI18n";

interface NotesPanelProps {
  notes: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export function NotesPanel(props: NotesPanelProps) {
  const { t } = useI18n();
  const isReadOnly = !props.editable || !props.onChange;

  return (
    <aside className="diagram-notes-panel" aria-label={t("notesPanel.shellAria")}>
      <header className="diagram-notes-panel-head">
        <h2>{t("notesPanel.title")}</h2>
        <span>{isReadOnly ? t("common.status.readOnly") : t("common.status.editing")}</span>
      </header>

      <textarea
        className="diagram-notes-editor"
        value={props.notes}
        onChange={(event) => props.onChange?.(event.target.value)}
        placeholder={t("notesPanel.placeholder")}
        readOnly={isReadOnly}
        spellCheck={false}
        aria-label={t("notesPanel.editorAria")}
      />
    </aside>
  );
}
