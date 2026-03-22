import { useEffect, useState } from "react";

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

const ERS_SAMPLE = `entity persona "PERSONA" {
  identifier id "ID"
  multivalued telefoni "TELEFONI"
}

entity dipendente "DIPENDENTE" weak {
}

entity consulente "CONSULENTE" {
}

inheritance dipendente -> persona disjoint total
inheritance consulente -> persona overlap partial`;

export function CodeModePanel(props: CodeModePanelProps) {
  const [guideOpen, setGuideOpen] = useState(props.layout === "code");

  useEffect(() => {
    if (props.layout === "code") {
      setGuideOpen(true);
    }
  }, [props.layout]);

  return (
    <section className={props.layout === "split" ? "code-mode-panel split" : "code-mode-panel"}>
      <div className="code-mode-head">
        <div>
          <div className="panel-heading">Code Mode</div>
          <h2>{props.diagramName}.ers</h2>
          <p>Scrivi il diagramma in linguaggio ER Studio: il canvas si sincronizza live mentre digiti.</p>
        </div>

        <div className="code-mode-actions">
          <button type="button" className="header-button" onClick={props.onOpenTutorial}>
            Tutorial Code
          </button>
          <button type="button" className="header-button" onClick={props.onLoad}>
            Carica .ers
          </button>
          <button type="button" className="header-button" onClick={props.onDownload}>
            Scarica .ers
          </button>
          <button type="button" className="header-button" onClick={props.onReset}>
            Rigenera dal diagramma
          </button>
        </div>
      </div>

      <div className="code-mode-status">
        <span>{props.nodeCount} nodi</span>
        <span>{props.edgeCount} collegamenti</span>
        <span>{props.issueCount} validazioni</span>
        <span>{props.parseError ? "Codice non valido" : "Sync live attivo"}</span>
      </div>

      {props.parseError ? <div className="code-mode-error">{props.parseError}</div> : null}

      <div className="code-mode-body">
        <label className="code-mode-editor">
          <span className="panel-heading minor">Sorgente ERS</span>
          <textarea
            value={props.code}
            spellCheck={false}
            onChange={(event) => props.onCodeChange(event.target.value)}
          />
        </label>

        <aside className="code-mode-guide">
          <button
            type="button"
            className="code-mode-guide-toggle"
            onClick={() => setGuideOpen((current) => !current)}
            aria-expanded={guideOpen}
          >
            <span className="panel-heading minor">Sintassi</span>
            <span>{guideOpen ? "Nascondi" : "Mostra"}</span>
          </button>

          {guideOpen ? (
            <>
              <ul className="code-mode-guide-list">
                <li>
                  <code>entity nome &quot;LABEL&quot; {"{"} ... {"}"}</code> descrive l&apos;entita e i suoi attributi.
                </li>
                <li>`relation nome "LABEL" entitaA "(0,N)" entitaB "(1,N)"` descrive una relazione binaria.</li>
                <li>Nel blocco usa `attribute`, `identifier`, `composite`, `multivalued`; `multivalued` crea l&apos;attributo composto principale a cui puoi collegare altri attributi.</li>
                <li>Le generalizzazioni accettano anche `disjoint` o `overlap` e `total` o `partial` sulla stessa riga `inheritance`.</li>
                <li>Per casi avanzati di relazione puoi usare `connect` ed `external` dentro il blocco `relation`.</li>
                <li>Il layout del canvas resta separato dal codice: coordinate e dimensioni non vengono serializzate.</li>
                <li>La sincronizzazione e live: quando il codice e valido il diagramma viene aggiornato automaticamente.</li>
              </ul>

              <div className="panel-heading minor">Esempio</div>
              <pre className="code-mode-sample">{ERS_SAMPLE}</pre>
            </>
          ) : (
            <p className="code-mode-guide-hint">Apri la guida per vedere sintassi ed esempio del DSL.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
