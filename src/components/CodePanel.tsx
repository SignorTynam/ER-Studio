import type { CSSProperties } from "react";
import { useI18n } from "../i18n/useI18n";
import type { EditorDiagnostic, EditorLanguage } from "../types/editor";
import { buildLineNumbers } from "../utils/codeEditor";
import { CodeEditorSurface } from "./editor/CodeEditorSurface";
import { WorkspacePanelHeader } from "./workspace/WorkspacePanel";

interface CodePanelProps {
  code: string;
  language?: EditorLanguage;
  placeholder?: string;
  editable?: boolean;
  readOnly?: boolean;
  parseError?: string;
  diagnostics?: EditorDiagnostic[];
  editorAriaLabel?: string;
  onCodeChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClose?: () => void;
  embedded?: boolean;
  showHeader?: boolean;
  showCloseButton?: boolean;
}

export function CodePanel(props: CodePanelProps) {
  const { t } = useI18n();
  const language = props.language ?? "ers";
  const readOnly = props.readOnly ?? (!props.editable || !props.onCodeChange);
  const lineNumberDigits = String(buildLineNumbers(props.code).length).length;
  const showHeader = props.showHeader ?? !props.embedded;
  const showCloseButton = props.showCloseButton ?? (!props.embedded && Boolean(props.onClose));
  const diagnostics = props.diagnostics ?? (props.parseError ? [{
    id: "code-panel-parse-error",
    level: "error" as const,
    message: props.parseError,
  }] : []);

  return (
    <aside
      className={props.embedded ? "designer-code-dock diagram-code-panel embedded" : "designer-code-dock diagram-code-panel"}
      style={props.embedded ? ({ "--line-number-digits": lineNumberDigits } as CSSProperties) : undefined}
      aria-label={t("codePanel.shellAria")}
    >
      {showHeader ? (
        <WorkspacePanelHeader
          title={t("codePanel.title")}
          badge={diagnostics.length || undefined}
          badgeLabel={diagnostics.length ? t("codeEditor.diagnostic.count", { count: diagnostics.length }) : undefined}
          onClose={showCloseButton ? props.onClose : undefined}
          closeLabel={t("codePanel.closeAria")}
        />
      ) : null}
      <CodeEditorSurface
        value={props.code}
        language={language}
        readOnly={readOnly}
        onChange={props.onCodeChange}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        placeholder={props.placeholder ?? t("codePanel.placeholder")}
        ariaLabel={props.editorAriaLabel ?? t("codePanel.editorAria")}
        diagnostics={diagnostics}
      />
    </aside>
  );
}
