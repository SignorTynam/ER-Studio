import { useId, useRef } from "react";
import type { LogicalIssue } from "../../types/logical";
import type { EditorDiagnostic } from "../../types/editor";
import type { SqlReverseDialect, SqlReverseIssue } from "../../types/sqlReverse";
import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { CodeEditorSurface } from "../editor/CodeEditorSurface";
import { Tooltip } from "../ui";
import { PanelIconButton, WorkspacePanel, WorkspacePanelHeader } from "../workspace/WorkspacePanel";
import { SQL_REVERSE_DIALECTS } from "../../utils/sqlReverseDialectPreference";

interface SqlReversePanelProps {
  sql: string;
  errorMessage: string;
  issues: SqlReverseIssue[];
  logicalIssues: LogicalIssue[];
  tableCount: number;
  unsupportedStatementCount: number;
  isPreviewReady: boolean;
  sourceFileName?: string;
  dialect: SqlReverseDialect;
  onDialectChange: (dialect: SqlReverseDialect) => void;
  onSqlChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadFile: (file: File) => void;
  onClear: () => void;
  onClose?: () => void;
  closeLabel?: string;
}

function buildDiagnostics(
  errorMessage: string,
  issues: SqlReverseIssue[],
  logicalIssues: LogicalIssue[],
): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [
    ...issues.map((issue) => ({
      id: issue.id,
      level: issue.level,
      message: issue.message,
      line: issue.sourceSpan?.line,
      column: issue.sourceSpan?.column,
      startOffset: issue.sourceSpan?.start,
      endOffset: issue.sourceSpan?.end,
    })),
    ...logicalIssues.map((issue) => ({
      id: `logical:${issue.id}`,
      level: issue.level,
      message: issue.message,
    })),
  ];
  if (errorMessage && !diagnostics.some((diagnostic) => diagnostic.level === "error" && diagnostic.message === errorMessage)) {
    diagnostics.unshift({ id: "sql-reverse-error", level: "error", message: errorMessage });
  }
  return diagnostics;
}

export function SqlReversePanel({
  sql,
  errorMessage,
  issues,
  logicalIssues,
  tableCount,
  unsupportedStatementCount,
  isPreviewReady,
  sourceFileName,
  dialect,
  onDialectChange,
  onSqlChange,
  onAnalyze,
  onLoadFile,
  onClear,
  onClose,
  closeLabel,
}: SqlReversePanelProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialectSelectId = useId();
  const diagnostics = buildDiagnostics(errorMessage, issues, logicalIssues);
  const lineCount = Math.max(1, sql.split(/\r?\n/).length);

  return (
    <WorkspacePanel className="sql-reverse-panel" label={t("sqlReversePanel.title")}>
      <WorkspacePanelHeader
        title={t("sqlReversePanel.title")}
        badge={diagnostics.length || undefined}
        badgeLabel={diagnostics.length ? t("codeEditor.diagnostic.count", { count: diagnostics.length }) : undefined}
        onClose={onClose}
        closeLabel={closeLabel ?? t("workspaceActivity.closePanel")}
      >
        <PanelIconButton
          icon="upload"
          label={t("sqlReversePanel.importFile")}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          className="hidden-input"
          type="file"
          accept=".sql,text/sql,text/plain"
          aria-label={t("sqlReversePanel.importFile")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) onLoadFile(file);
          }}
        />
      </WorkspacePanelHeader>

      <div className="sql-reverse-panel__toolbar">
        <label htmlFor={dialectSelectId} className="sql-reverse-panel__dialect-label">
          {t("sqlReversePanel.dialect.label")}
        </label>
        <Tooltip label={t("sqlReversePanel.dialect.hint")} position="bottom" className="sql-reverse-panel__dialect-tip">
          {({ "aria-describedby": describedBy }) => (
            <select
              id={dialectSelectId}
              className="settings-select sql-reverse-panel__dialect-select"
              value={dialect}
              aria-describedby={describedBy}
              onChange={(event) => onDialectChange(event.target.value as SqlReverseDialect)}
            >
              {SQL_REVERSE_DIALECTS.map((value) => (
                <option key={value} value={value}>
                  {t(`sqlReversePanel.dialect.options.${value}`)}
                </option>
              ))}
            </select>
          )}
        </Tooltip>
      </div>

      <div className="sql-reverse-panel__editor-surface">
        <CodeEditorSurface
          value={sql}
          language="sql"
          readOnly={false}
          onChange={onSqlChange}
          placeholder={t("sqlReversePanel.placeholder")}
          ariaLabel={t("codeEditor.sqlReverseAria")}
          diagnostics={diagnostics}
        />
      </div>

      <div className="sql-reverse-panel__meta" aria-label={t("codeEditor.status")}>
        <span>{t("workspaceChrome.lineCount", { count: lineCount })}</span>
        <span>{sourceFileName ?? t("codeEditor.draftUnbound")}</span>
        {isPreviewReady ? <span>{t("sqlReversePanel.tables", { count: tableCount })}</span> : null}
        {unsupportedStatementCount > 0 ? <span>{t("sqlReversePanel.unsupported", { count: unsupportedStatementCount })}</span> : null}
        {diagnostics.length > 0 ? <span>{t("codeEditor.diagnostic.count", { count: diagnostics.length })}</span> : null}
      </div>

      <footer className="sql-reverse-panel__footer">
        <button type="button" className="project-activity-action" onClick={onClear}>
          <StudioIcon name="delete" aria-hidden="true" />
          <span>{t("sqlReversePanel.clear")}</span>
        </button>
        <button type="button" className="project-activity-action primary" onClick={() => onAnalyze()} disabled={sql.trim().length === 0}>
          <StudioIcon name="databaseReverse" aria-hidden="true" />
          <span>{t("sqlReversePanel.analyze")}</span>
        </button>
      </footer>
    </WorkspacePanel>
  );
}
