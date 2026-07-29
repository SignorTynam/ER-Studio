import type { ProjectTextWorkspaceFile } from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";
import { CodeEditorSurface } from "../editor/CodeEditorSurface";

interface WorkspaceTextEditorProps {
  file: ProjectTextWorkspaceFile;
  editable: boolean;
  onChange: (value: string) => void;
}

export function WorkspaceTextEditor({ file, editable, onChange }: WorkspaceTextEditorProps) {
  const { t } = useI18n();
  const lineCount = file.content.length === 0 ? 1 : file.content.split("\n").length;
  const language = file.kind === "sql" ? "SQL" : t("workspaceChrome.fileTypes.text");

  return (
    <section
      className={file.kind === "sql" ? "workspace-text-editor workspace-text-editor--sql" : "workspace-text-editor"}
      aria-label={t(
        file.kind === "sql" ? "workspaceChrome.sqlEditorAria" : "workspaceChrome.textEditorAria",
        { name: file.name },
      )}
    >
      {file.kind === "sql" ? (
        <div className="workspace-text-editor__surface">
          <CodeEditorSurface
            value={file.content}
            language="sql"
            readOnly={!editable}
            onChange={onChange}
            placeholder={t("workspaceChrome.sqlPlaceholder")}
            ariaLabel={t("workspaceChrome.sqlEditorAria", { name: file.name })}
          />
        </div>
      ) : (
        <textarea
          className="workspace-text-editor__input"
          value={file.content}
          onChange={(event) => onChange(event.target.value)}
          readOnly={!editable}
          spellCheck
          aria-label={t("workspaceChrome.textEditorAria", { name: file.name })}
          placeholder={t("textFileModal.placeholder")}
        />
      )}
      <footer className="workspace-text-editor__footer">
        <span>{language}</span>
        <span>{t("workspaceChrome.lineCount", { count: lineCount })}</span>
        <span>{editable ? t("workspaceChrome.editable") : t("workspaceChrome.readOnly")}</span>
      </footer>
    </section>
  );
}

