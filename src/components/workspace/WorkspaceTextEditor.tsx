import type { ProjectTextWorkspaceFile } from "../../types/projectExplorer";
import { useI18n } from "../../i18n/useI18n";

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
    <main className="workspace-text-editor" aria-label={t("workspaceChrome.textEditorAria", { name: file.name })}>
      <textarea
        className="workspace-text-editor__input"
        value={file.content}
        onChange={(event) => onChange(event.target.value)}
        readOnly={!editable}
        spellCheck={file.kind !== "sql"}
        aria-label={t("workspaceChrome.textEditorAria", { name: file.name })}
        placeholder={file.kind === "sql" ? t("workspaceChrome.sqlPlaceholder") : t("textFileModal.placeholder")}
      />
      <footer className="workspace-text-editor__footer">
        <span>{language}</span>
        <span>{t("workspaceChrome.lineCount", { count: lineCount })}</span>
        <span>{editable ? t("workspaceChrome.editable") : t("workspaceChrome.readOnly")}</span>
      </footer>
    </main>
  );
}

