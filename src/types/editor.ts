export type EditorLanguage = "ers" | "sql" | "relational";

export type EditorDiagnosticLevel = "error" | "warning";

export interface EditorDiagnostic {
  id: string;
  level: EditorDiagnosticLevel;
  message: string;
  line?: number;
  column?: number;
  startOffset?: number;
  endOffset?: number;
}
