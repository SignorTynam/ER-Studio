import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n/useI18n";
import type { EditorDiagnostic, EditorLanguage } from "../../types/editor";
import { applyAutoPairEdit, applyTabEdit, buildLineNumbers } from "../../utils/codeEditor";
import { StudioIcon } from "../icons/StudioIcon";

interface CodeEditorSurfaceProps {
  value: string;
  language: EditorLanguage;
  readOnly: boolean;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  ariaLabel: string;
  diagnostics?: EditorDiagnostic[];
  onExecute?: () => void;
}

export interface CodeEditorSurfaceHandle {
  getSelectionStart: () => number;
  getSelectionEnd: () => number;
  getSelectedText: () => string;
  getValue: () => string;
  focus: () => void;
  /** Fase K3 — porta cursore e vista alla riga 1-based, con evidenziazione temporanea. */
  revealLine: (line: number) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightErsLine(line: string): string {
  if (/^\s*(\/\*|\*|\/\/|#)/.test(line)) {
    return `<span class="ers-token-comment">${escapeHtml(line)}</span>`;
  }

  const keywordPattern = /^(diagram|entity|relation|relationship|connector|attribute-link|attribute|identifier|multivalued|generalization|inheritance|external|connect|notes)$/i;
  const modifierPattern = /^(id|fromIdentifier|local|card|one|zero|many|partial|total|disjoint|overlap)$/i;
  const cardinalityPattern = /^\(?[0-9N]+,[0-9N]+\)?$/i;
  const namePattern = /^[A-Z][A-Za-z0-9_]*$/;

  return line
    .split(/(\s+|"(?:\\.|[^"\\])*"|\([0-9N]+,[0-9N]+\)|[{}()[\],])/g)
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const escaped = escapeHtml(token);
      if (/^"/.test(token)) {
        const body = token.slice(1, -1);
        return cardinalityPattern.test(body)
          ? `<span class="ers-token-card">${escaped}</span>`
          : `<span class="ers-token-string">${escaped}</span>`;
      }
      if (cardinalityPattern.test(token)) return `<span class="ers-token-card">${escaped}</span>`;
      if (keywordPattern.test(token)) return `<span class="ers-token-keyword">${escaped}</span>`;
      if (modifierPattern.test(token)) return `<span class="ers-token-modifier">${escaped}</span>`;
      if (namePattern.test(token)) return `<span class="ers-token-name">${escaped}</span>`;
      return escaped;
    })
    .join("");
}

const SQL_KEYWORDS = new Set([
  "ACTION", "ALL", "ALTER", "AND", "AS", "ATTACH", "BEGIN", "BETWEEN", "BY", "CASCADE", "CASE",
  "CHECK", "COMMIT", "CONSTRAINT", "CREATE", "CROSS", "DEFAULT", "DELETE", "DETACH", "DISTINCT",
  "DROP", "ELSE", "END", "EXISTS", "FOREIGN", "FROM", "GROUP", "HAVING", "IF", "IN", "INDEX",
  "INNER", "INSERT", "INTO", "IS", "JOIN", "KEY", "LEFT", "LIKE", "LIMIT", "NO", "NOT", "NULL",
  "OFFSET", "ON", "OR", "ORDER", "PRAGMA", "PRIMARY", "RECURSIVE", "REFERENCES", "RESTRICT",
  "RETURNING", "RIGHT", "ROLLBACK", "SELECT", "SET", "TABLE", "TEMP", "TEMPORARY", "THEN",
  "TRIGGER", "UNION", "UNIQUE", "UPDATE", "VALUES", "VIEW", "WHEN", "WHERE", "WITH",
]);
const SQL_TYPES = new Set([
  "BIGINT", "BIT", "BLOB", "BOOLEAN", "CHAR", "CLOB", "DATE", "DATETIME", "DECIMAL", "DOUBLE",
  "FLOAT", "INT", "INTEGER", "JSON", "NCHAR", "NUMERIC", "NVARCHAR", "REAL", "SMALLINT", "TEXT",
  "TIME", "TIMESTAMP", "VARBINARY", "VARCHAR",
]);
const SQL_MODIFIERS = new Set([
  "ACTION", "AUTOINCREMENT", "AUTO_INCREMENT", "COLLATE", "CONSTRAINT", "DEFAULT", "DELETE",
  "GENERATED", "IDENTITY", "NO", "NOT", "NULL", "ON", "UNIQUE", "UPDATE",
]);

function highlightSqlLine(line: string): string {
  const tokenPattern = /(--.*$|\/\*.*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]+\]|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_$]*\b|[(),.;:=])/g;
  let highlighted = "";
  let lastIndex = 0;
  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    highlighted += escapeHtml(line.slice(lastIndex, index));
    const upper = token.toUpperCase();
    const escaped = escapeHtml(token);
    if (token.startsWith("--") || token.startsWith("/*")) highlighted += `<span class="sql-token-comment">${escaped}</span>`;
    else if (token.startsWith("'") ) highlighted += `<span class="sql-token-string">${escaped}</span>`;
    else if (/^("|`|\[)/.test(token)) highlighted += `<span class="sql-token-identifier">${escaped}</span>`;
    else if (/^\d/.test(token)) highlighted += `<span class="sql-token-number">${escaped}</span>`;
    else if (SQL_TYPES.has(upper)) highlighted += `<span class="sql-token-type">${escaped}</span>`;
    else if (SQL_MODIFIERS.has(upper)) highlighted += `<span class="sql-token-modifier">${escaped}</span>`;
    else if (SQL_KEYWORDS.has(upper)) highlighted += `<span class="sql-token-keyword">${escaped}</span>`;
    else if (/^[(),.;:=]$/.test(token)) highlighted += `<span class="sql-token-punctuation">${escaped}</span>`;
    else highlighted += escaped;
    lastIndex = index + token.length;
  }
  return highlighted + escapeHtml(line.slice(lastIndex));
}

function relationalIdentifierClass(token: string, followedByReference: boolean): string {
  if (followedByReference) return "designer-relational-schema-foreign-key";
  if (token.includes("\u0332")) return "designer-relational-schema-primary-key";
  return "designer-relational-schema-attribute";
}

function highlightRelationalLine(line: string): string {
  const openIndex = line.indexOf("(");
  if (openIndex < 0) {
    if (/^\s*\)\s*$/.test(line)) {
      return `${line.match(/^\s*/)?.[0] ?? ""}<span class="designer-relational-schema-punctuation">)</span>`;
    }
    const attributeMatch = line.match(/^(\s*)([^,:\s)]+)(?::([^,\s)]+))?(,?)(\s*)$/);
    if (!attributeMatch) return escapeHtml(line);
    const [, indent = "", attribute = "", reference, comma = "", suffix = ""] = attributeMatch;
    const attributeClass = relationalIdentifierClass(attribute, Boolean(reference));
    return `${indent}<span class="${attributeClass}">${escapeHtml(attribute)}</span>${reference ? `<span class="designer-relational-schema-reference-separator">:</span><span class="designer-relational-schema-reference">${escapeHtml(reference)}</span>` : ""}${comma ? `<span class="designer-relational-schema-punctuation">,</span>` : ""}${suffix}`;
  }
  const prefix = line.slice(0, openIndex);
  let output = `<span class="designer-relational-schema-table">${escapeHtml(prefix.trim())}</span>`;
  output += `<span class="designer-relational-schema-punctuation">(</span>`;
  const body = line.slice(openIndex + 1);
  const tokens = body.split(/(\s+|,|\)|:)/g).filter((token) => token.length > 0);
  let afterReferenceSeparator = false;
  tokens.forEach((token, index) => {
    if (/^\s+$/.test(token)) {
      output += token;
      return;
    }
    if (token === "," || token === ")") {
      output += `<span class="designer-relational-schema-punctuation">${token}</span>`;
      afterReferenceSeparator = false;
      return;
    }
    if (token === ":") {
      output += `<span class="designer-relational-schema-reference-separator">:</span>`;
      afterReferenceSeparator = true;
      return;
    }
    if (afterReferenceSeparator) {
      output += `<span class="designer-relational-schema-reference">${escapeHtml(token)}</span>`;
      return;
    }
    const followedByReference = tokens.slice(index + 1).find((candidate) => !/^\s+$/.test(candidate)) === ":";
    output += `<span class="${relationalIdentifierClass(token, followedByReference)}">${escapeHtml(token)}</span>`;
  });
  return output;
}

export function highlightEditorLine(line: string, language: EditorLanguage): string {
  if (language === "sql") return highlightSqlLine(line);
  if (language === "relational") return highlightRelationalLine(line);
  return highlightErsLine(line);
}

function diagnosticClass(diagnostic: EditorDiagnostic | undefined): string {
  return diagnostic ? ` code-editor-line--${diagnostic.level}` : "";
}

export const CodeEditorSurface = forwardRef<CodeEditorSurfaceHandle, CodeEditorSurfaceProps>(function CodeEditorSurface({
  value,
  language,
  readOnly,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  ariaLabel,
  diagnostics = [],
  onExecute,
}, forwardedRef) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const lineNumberRef = useRef<HTMLDivElement | null>(null);
  const announcedDiagnosticRef = useRef("");
  const flashTimerRef = useRef<number | null>(null);
  const [activeDiagnosticIndex, setActiveDiagnosticIndex] = useState<number | null>(diagnostics.length ? 0 : null);
  const [flashLine, setFlashLine] = useState<number | null>(null);

  function offsetRangeForLine(source: string, line: number): { start: number; end: number } {
    const lines = source.split(/\r?\n/);
    const clamped = Math.max(1, Math.min(line, lines.length));
    let start = 0;
    for (let index = 0; index < clamped - 1; index += 1) {
      start += lines[index].length + 1; // +1 per il ritorno a capo (textarea normalizza a \n)
    }
    return { start, end: start + (lines[clamped - 1]?.length ?? 0) };
  }

  function revealLine(line: number) {
    const editor = editorRef.current;
    if (!editor || !Number.isFinite(line) || line < 1) return;
    const { start, end } = offsetRangeForLine(value, line);
    editor.focus();
    editor.setSelectionRange(start, end);
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 21;
    editor.scrollTop = Math.max(0, (line - 2) * lineHeight);
    syncScroll();
    setFlashLine(line);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashLine(null), 1200);
  }

  useImperativeHandle(forwardedRef, () => ({
    getSelectionStart: () => editorRef.current?.selectionStart ?? 0,
    getSelectionEnd: () => editorRef.current?.selectionEnd ?? 0,
    getSelectedText: () => {
      const editor = editorRef.current;
      return editor ? value.slice(editor.selectionStart, editor.selectionEnd) : "";
    },
    getValue: () => value,
    focus: () => editorRef.current?.focus(),
    revealLine,
  }), [value]);

  useEffect(() => () => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
  }, []);
  const lineNumbers = buildLineNumbers(value);
  const diagnosticByLine = useMemo(() => {
    const result = new Map<number, EditorDiagnostic>();
    diagnostics.forEach((diagnostic) => {
      if (diagnostic.line && !result.has(diagnostic.line)) result.set(diagnostic.line, diagnostic);
    });
    return result;
  }, [diagnostics]);
  const orderedDiagnostics = useMemo(
    () => [...diagnostics].sort((left, right) => Number(right.level === "error") - Number(left.level === "error")),
    [diagnostics],
  );
  const activeDiagnostic = activeDiagnosticIndex === null ? undefined : orderedDiagnostics[activeDiagnosticIndex];
  let inSqlBlockComment = false;
  const highlightedCode = value.split(/\r?\n/).map((line, index) => {
    const diagnostic = diagnosticByLine.get(index + 1);
    let highlightedLine: string;
    if (language === "sql" && (inSqlBlockComment || line.includes("/*"))) {
      highlightedLine = `<span class="sql-token-comment">${escapeHtml(line)}</span>`;
      if (line.includes("/*") && !line.slice(line.indexOf("/*") + 2).includes("*/")) inSqlBlockComment = true;
      if (inSqlBlockComment && line.includes("*/")) inSqlBlockComment = false;
    } else {
      highlightedLine = highlightEditorLine(line, language);
    }
    const flashClass = flashLine === index + 1 ? " code-editor-line--flash" : "";
    return `<span class="code-editor-line${diagnosticClass(diagnostic)}${flashClass}" data-line="${index + 1}">${highlightedLine || "&#8203;"}</span>`;
  }).join("");

  function syncScroll() {
    if (!editorRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
    if (lineNumberRef.current) lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
  }

  function moveCursor(selectionStart: number, selectionEnd = selectionStart) {
    window.requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.selectionStart = selectionStart;
      editorRef.current.selectionEnd = selectionEnd;
      syncScroll();
    });
  }

  function applyEditorEdit(nextValue: string, selectionStart: number, selectionEnd = selectionStart) {
    if (readOnly || !onChange) return;
    onChange(nextValue);
    moveCursor(selectionStart, selectionEnd);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && onExecute) {
      event.preventDefault();
      onExecute();
      return;
    }
    if (event.key === "Escape" && activeDiagnosticIndex !== null) {
      event.preventDefault();
      event.stopPropagation();
      setActiveDiagnosticIndex(null);
      return;
    }
    if (readOnly || !onChange || event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const { selectionStart, selectionEnd, value: editorValue } = event.currentTarget;
    if (event.key === "Tab") {
      event.preventDefault();
      const edit = applyTabEdit(editorValue, selectionStart, selectionEnd);
      applyEditorEdit(edit.value, edit.selectionStart, edit.selectionEnd);
      return;
    }
    const pairEdit = applyAutoPairEdit(editorValue, selectionStart, selectionEnd, event.key);
    if (pairEdit) {
      event.preventDefault();
      applyEditorEdit(pairEdit.value, pairEdit.selectionStart, pairEdit.selectionEnd);
    }
  }

  function openDiagnostic(diagnostic: EditorDiagnostic) {
    const index = orderedDiagnostics.findIndex((candidate) => candidate.id === diagnostic.id);
    if (index >= 0) setActiveDiagnosticIndex(index);
  }

  function handleEditorClick(event: MouseEvent<HTMLTextAreaElement>) {
    const line = event.currentTarget.value.slice(0, event.currentTarget.selectionStart).split(/\r?\n/).length;
    const diagnostic = diagnosticByLine.get(line);
    if (diagnostic) openDiagnostic(diagnostic);
  }

  useEffect(() => {
    syncScroll();
  }, [value]);

  useEffect(() => {
    const primary = orderedDiagnostics[0];
    if (!primary) {
      setActiveDiagnosticIndex(null);
      announcedDiagnosticRef.current = "";
      return;
    }
    const signature = `${primary.level}:${primary.line ?? ""}:${primary.message}`;
    if (signature === announcedDiagnosticRef.current) return;
    announcedDiagnosticRef.current = signature;
    setActiveDiagnosticIndex(0);
    if (primary.line && editorRef.current) {
      const lineHeight = Number.parseFloat(getComputedStyle(editorRef.current).lineHeight) || 21;
      const targetTop = Math.max(0, (primary.line - 2) * lineHeight);
      editorRef.current.scrollTop = targetTop;
      syncScroll();
    }
  }, [orderedDiagnostics]);

  const diagnosticPopover = activeDiagnostic ? (
    <section
      className={`code-editor-diagnostic-popover level-${activeDiagnostic.level}`}
      role={activeDiagnostic.level === "error" ? "alert" : "status"}
      aria-label={t("codeEditor.diagnostic.popupLabel")}
    >
      <div className="code-editor-diagnostic-popover__heading">
        <strong>
          {activeDiagnostic.line
            ? t(`codeEditor.diagnostic.${activeDiagnostic.level}AtLine`, { line: activeDiagnostic.line })
            : t(`codeEditor.diagnostic.${activeDiagnostic.level}`)}
        </strong>
        <button type="button" onClick={() => setActiveDiagnosticIndex(null)} aria-label={t("codeEditor.diagnostic.close")}>
          <StudioIcon name="close" aria-hidden="true" />
        </button>
      </div>
      <p>{activeDiagnostic.message}</p>
      {activeDiagnostic.line ? (
        <button
          type="button"
          className="code-editor-diagnostic-popover__goto"
          onClick={() => revealLine(activeDiagnostic.line as number)}
        >
          <StudioIcon name="arrowRight" aria-hidden="true" />
          <span>{t("codeEditor.diagnostic.goToLine", { line: activeDiagnostic.line })}</span>
        </button>
      ) : null}
      {orderedDiagnostics.length > 1 ? (
        <footer>
          <button type="button" onClick={() => setActiveDiagnosticIndex((current) => current === null ? 0 : (current - 1 + orderedDiagnostics.length) % orderedDiagnostics.length)} aria-label={t("codeEditor.diagnostic.previous")}>
            <StudioIcon name="arrowLeft" aria-hidden="true" />
          </button>
          <span>{t("codeEditor.diagnostic.position", { current: (activeDiagnosticIndex ?? 0) + 1, count: orderedDiagnostics.length })}</span>
          <button type="button" onClick={() => setActiveDiagnosticIndex((current) => current === null ? 0 : (current + 1) % orderedDiagnostics.length)} aria-label={t("codeEditor.diagnostic.next")}>
            <StudioIcon name="arrowRight" aria-hidden="true" />
          </button>
        </footer>
      ) : null}
    </section>
  ) : null;
  const diagnosticPortalTarget = typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(".workspace-toast-stack") ?? document.body;

  return (
    <>
      <div className="designer-code-editor">
        <div ref={lineNumberRef} className="designer-code-line-numbers">
          {lineNumbers.map((lineNumber, index) => {
            const diagnostic = diagnosticByLine.get(index + 1);
            return diagnostic ? (
              <button
                key={lineNumber}
                type="button"
                className={`code-editor-gutter-line code-editor-gutter-line--${diagnostic.level}`}
                onClick={() => openDiagnostic(diagnostic)}
                aria-label={t(`codeEditor.diagnostic.${diagnostic.level}AtLine`, { line: index + 1 })}
              >
                {lineNumber}<span className="code-editor-gutter-marker" aria-hidden="true">!</span>
              </button>
            ) : <span key={lineNumber} aria-hidden="true">{lineNumber}</span>;
          })}
        </div>
        <div className="designer-code-scroll-layer">
          <pre
            ref={highlightRef}
            className="designer-code-highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
          {value.length === 0 ? <div className="designer-code-placeholder" aria-hidden="true">{placeholder}</div> : null}
          <textarea
            ref={editorRef}
            className="designer-code-input"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={handleEditorKeyDown}
            onClick={handleEditorClick}
            onScroll={syncScroll}
            spellCheck={false}
            wrap="off"
            readOnly={readOnly}
            aria-label={ariaLabel}
            aria-invalid={orderedDiagnostics.some((diagnostic) => diagnostic.level === "error") || undefined}
          />
        </div>
      </div>
      {diagnosticPopover && diagnosticPortalTarget
        ? createPortal(diagnosticPopover, diagnosticPortalTarget)
        : diagnosticPopover}
    </>
  );
});
