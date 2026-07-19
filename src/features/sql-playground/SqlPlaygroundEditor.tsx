import { useRef, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import { Button, Field, Tooltip } from "../../components/ui";

interface SqlPlaygroundEditorProps {
  value: string;
  running: boolean;
  executeDisabled: boolean;
  onChange: (value: string) => void;
  onExecute: (sql: string) => void;
}

export function SqlPlaygroundEditor({
  value,
  running,
  executeDisabled,
  onChange,
  onExecute,
}: SqlPlaygroundEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function executeSelectionOrAll(): void {
    const textarea = textareaRef.current;
    const selection = textarea && textarea.selectionStart !== textarea.selectionEnd
      ? value.slice(textarea.selectionStart, textarea.selectionEnd)
      : value;
    onExecute(selection);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    if (!executeDisabled) executeSelectionOrAll();
  }

  return (
    <section className="sql-playground-editor" aria-labelledby="sql-playground-editor-title">
      <div className="sql-playground-section-heading">
        <div>
          <h2 id="sql-playground-editor-title">{t("sqlPlayground.editor.title")}</h2>
          <p>{t("sqlPlayground.editor.help")}</p>
        </div>
        <Tooltip label={t("sqlPlayground.executeTooltip")} position="bottom">
          {(aria) => (
            <Button
              variant="primary"
              size="sm"
              iconLeft="code"
              loading={running}
              disabled={executeDisabled}
              onClick={executeSelectionOrAll}
              {...aria}
            >
              {t("sqlPlayground.execute")}
            </Button>
          )}
        </Tooltip>
      </div>
      <Field label={t("sqlPlayground.editor.label")} className="sql-playground-editor__field">
        {({ id, describedBy }) => (
          <textarea
            ref={textareaRef}
            id={id}
            className="sql-playground-editor__input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-describedby={describedBy}
            placeholder={t("sqlPlayground.editor.placeholder")}
            spellCheck={false}
          />
        )}
      </Field>
    </section>
  );
}
