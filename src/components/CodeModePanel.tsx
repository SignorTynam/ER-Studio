import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

interface CodeModePanelProps {
  code: string;
  dirty: boolean;
  parseError: string;
  diagramName: string;
  nodeCount: number;
  edgeCount: number;
  issueCount: number;
  layout: "code" | "split";
  onCodeChange: (value: string) => void;
  onReset: () => void;
  onDownload: () => void;
  onLoad: () => void;
  onOpenTutorial: () => void;
}

const KEYWORD_PATTERN =
  /\b(?:diagram|entity|relationship|relation|attribute|identifier|composite|multivalued|inheritance|connect|external|text|weak|label|card|style|offset|disjoint|overlap|total|partial|from|to|target|targetEntity|targetAttribute|sourceAttribute|compositeInternal)\b/g;
const STRING_PATTERN = /"(?:\\.|[^"\\])*"/g;
const CARDINALITY_PATTERN = /\((?:0|1),(?:1|N)\)/g;
const TOKEN_PATTERN =
  /#.*$|\/\/.*$|"(?:\\.|[^"\\])*"|->|\b(?:diagram|entity|relationship|relation|attribute|identifier|composite|multivalued|inheritance|connect|external|text|weak|label|card|style|offset|disjoint|overlap|total|partial|from|to|target|targetEntity|targetAttribute|sourceAttribute|compositeInternal)\b|\((?:0|1),(?:1|N)\)|[{}]/g;

function parseErrorLine(error: string): number | null {
  const match = error.match(/Linea (\d+)/i);
  return match ? Number(match[1]) : null;
}

function highlightLine(line: string, lineIndex: number): ReactNode[] {
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const matcher = new RegExp(TOKEN_PATTERN);

  while ((match = matcher.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push(
        <span key={`plain-${lineIndex}-${lastIndex}`} className="code-token-plain">
          {line.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const token = match[0];
    let className = "code-token-plain";
    if (token.startsWith("#") || token.startsWith("//")) {
      className = "code-token-comment";
    } else if (token.startsWith("\"")) {
      className = "code-token-string";
    } else if (token === "->") {
      className = "code-token-operator";
    } else if (token === "{" || token === "}") {
      className = "code-token-punctuation";
    } else if (CARDINALITY_PATTERN.test(token)) {
      className = "code-token-cardinality";
    } else if (KEYWORD_PATTERN.test(token)) {
      className = "code-token-keyword";
    }

    KEYWORD_PATTERN.lastIndex = 0;
    CARDINALITY_PATTERN.lastIndex = 0;
    STRING_PATTERN.lastIndex = 0;

    segments.push(
      <span key={`token-${lineIndex}-${match.index}`} className={className}>
        {token}
      </span>,
    );
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    segments.push(
      <span key={`plain-tail-${lineIndex}-${lastIndex}`} className="code-token-plain">
        {line.slice(lastIndex)}
      </span>,
    );
  }

  if (segments.length === 0) {
    segments.push(
      <span key={`empty-${lineIndex}`} className="code-token-plain">
        {" "}
      </span>,
    );
  }

  return segments;
}

export function CodeModePanel(props: CodeModePanelProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lineCount = Math.max(1, props.code.split(/\r?\n/).length);
  const errorLine = parseErrorLine(props.parseError);
  const highlightedLines = useMemo(
    () =>
      props.code.split(/\r?\n/).map((line, index) => (
        <div key={`line-${index + 1}`} className="code-highlight-line">
          {highlightLine(line, index)}
        </div>
      )),
    [props.code],
  );

  function syncEditorScroll() {
    if (!editorRef.current) {
      return;
    }

    const { scrollTop, scrollLeft } = editorRef.current;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }

  useEffect(() => {
    syncEditorScroll();
  }, [props.code]);

  function focusErrorLine(lineNumber: number) {
    if (!editorRef.current) {
      return;
    }

    const lines = props.code.split(/\r?\n/);
    let start = 0;
    for (let index = 0; index < lineNumber - 1; index += 1) {
      start += (lines[index]?.length ?? 0) + 1;
    }

    const end = start + (lines[lineNumber - 1]?.length ?? 0);
    editorRef.current.focus();
    editorRef.current.setSelectionRange(start, end);

    const lineHeight = Number.parseFloat(window.getComputedStyle(editorRef.current).lineHeight) || 24;
    editorRef.current.scrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
    syncEditorScroll();
  }

  return (
    <section className={props.layout === "split" ? "code-mode-panel split" : "code-mode-panel"}>
      <div className="code-mode-head">
        <div>
          <div className="panel-heading">Code mode</div>
          <h2>{props.diagramName}.ers</h2>
          <p>Editor ERS essenziale, leggibile e sincronizzato con il modello.</p>
        </div>

        <div className="code-mode-actions">
          <button type="button" className="header-button" onClick={props.onLoad}>
            Carica ERS
          </button>
          <button type="button" className="header-button" onClick={props.onDownload}>
            Scarica ERS
          </button>
          <button type="button" className="header-button" onClick={props.onReset}>
            Rigenera
          </button>
          <button type="button" className="header-button" onClick={props.onOpenTutorial}>
            Guida
          </button>
        </div>
      </div>

      <div className="code-mode-status">
        <span className={props.dirty ? "code-mode-status-strong" : "code-mode-status-ok"}>
          {props.dirty ? "Bozza modificata" : "Bozza allineata"}
        </span>
        <span>{props.nodeCount} nodi</span>
        <span>{props.edgeCount} collegamenti</span>
        <span>{props.issueCount} controlli</span>
      </div>

      {props.parseError ? (
        <div className="code-mode-error code-mode-error-inline">
          <div className="code-mode-error-copy">
            <strong>Errore di parsing</strong>
            <p>{props.parseError}</p>
          </div>
          {errorLine ? (
            <button type="button" className="header-button" onClick={() => focusErrorLine(errorLine)}>
              Vai alla riga {errorLine}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="code-mode-hint">
          Sintassi semplice: scrivi il modello, il canvas si aggiorna in tempo reale quando il codice e valido.
        </p>
      )}

      <div className="code-editor-shell">
        <div className="code-editor-topbar">
          <span className="code-editor-file">{props.diagramName}.ers</span>
          <span className="code-editor-meta">{lineCount} righe</span>
        </div>

        <div className="code-editor-frame">
          <div ref={gutterRef} className="code-editor-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, index) => (
              <span
                key={`gutter-${index + 1}`}
                className={errorLine === index + 1 ? "code-editor-line-number error" : "code-editor-line-number"}
              >
                {index + 1}
              </span>
            ))}
          </div>

          <div className="code-editor-surface">
            <pre ref={highlightRef} className="code-editor-highlight" aria-hidden="true">
              {highlightedLines}
            </pre>
            <textarea
              ref={editorRef}
              className="code-editor-input"
              value={props.code}
              spellCheck={false}
              onChange={(event) => props.onCodeChange(event.target.value)}
              onScroll={syncEditorScroll}
            />
          </div>
        </div>
      </div>

      <div className="code-mode-reference">
        <div className="panel-heading minor">Sintassi essenziale</div>
        <div className="code-mode-reference-list">
          <code>entity ordine "ORDINE" {"{"}</code>
          <code>relation acquisto cliente "(0,N)" ordine "(1,1)"</code>
          <code>inheritance premium -&gt; cliente disjoint total</code>
        </div>
      </div>
    </section>
  );
}
