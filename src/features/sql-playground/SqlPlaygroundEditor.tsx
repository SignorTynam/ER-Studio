import { forwardRef } from "react";
import { CodeEditorSurface, type CodeEditorSurfaceHandle } from "../../components/editor/CodeEditorSurface";
import { useI18n } from "../../i18n/useI18n";

interface SqlPlaygroundEditorProps {
  value: string;
  executeDisabled: boolean;
  onChange: (value: string) => void;
  onExecute: () => void;
}

export const SqlPlaygroundEditor = forwardRef<CodeEditorSurfaceHandle, SqlPlaygroundEditorProps>(
  function SqlPlaygroundEditor({ value, executeDisabled, onChange, onExecute }, ref) {
    const { t } = useI18n();
    return (
      <section className="sql-playground-editor" aria-labelledby="sql-playground-editor-title">
        <div className="sql-playground-editor__tab">
          <h2 id="sql-playground-editor-title">{t("sqlPlayground.editor.title")}</h2>
        </div>
        <div className="sql-playground-editor__surface">
          <CodeEditorSurface
            ref={ref}
            value={value}
            language="sql"
            readOnly={false}
            onChange={onChange}
            onExecute={executeDisabled ? undefined : onExecute}
            placeholder={t("sqlPlayground.editor.placeholder")}
            ariaLabel={t("sqlPlayground.editor.label")}
          />
        </div>
      </section>
    );
  },
);
