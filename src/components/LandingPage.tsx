import type { AppChangelogEntry } from "../utils/appMeta";

interface LandingPageProps {
  appTitle: string;
  appVersion: string;
  latestRelease: AppChangelogEntry;
  onOpenStudio: () => void;
  onOpenCodeTutorial: () => void;
}

const NAV_ITEMS = [
  { label: "Panoramica", href: "#landing-home" },
  { label: "Workspace", href: "#landing-workspace" },
  { label: "Flusso", href: "#landing-flow" },
];

const WORKSPACE_PILLARS = [
  {
    title: "Layout piu rilassato",
    text:
      "Header, toolbar, canvas e inspector sono leggibili a colpo d'occhio, con piu aria tra i blocchi e meno rumore visivo.",
  },
  {
    title: "Gerarchia chiara",
    text:
      "Le azioni frequenti restano vicine, mentre i pannelli laterali diventano piu ordinati e coerenti con il ritmo del lavoro.",
  },
  {
    title: "Palette da studio",
    text:
      "Toni salvia, sabbia e ardesia mantengono il contrasto alto senza creare la fatica tipica delle interfacce troppo aggressive.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Apri lo studio solo quando sei pronto",
    text:
      "La landing ora funziona come una vera pagina introduttiva: spiega l'app, mostra il percorso e lascia entrare nello spazio operativo con intenzione.",
  },
  {
    step: "02",
    title: "Lavora con vista e modalita giuste",
    text:
      "Passi velocemente da Diagramma, Affiancata e Codice, senza perdere il contesto del progetto corrente.",
  },
  {
    step: "03",
    title: "Rifinisci e valida senza frizioni",
    text:
      "Toolbar, inspector e sincronizzazione ERS restano presenti ma meno invadenti, cosi il canvas torna davvero al centro.",
  },
];

const ERS_PREVIEW = `entity progetto "PROGETTO" {
  identifier id "ID"
  attribute nome "NOME"
}

relation assegna "ASSEGNA" {
  connect persona "(1,N)"
  connect progetto "(0,N)"
}`;

export function LandingPage(props: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-site-header">
        <div className="landing-header-main">
          <a className="landing-brand-link" href="#landing-home" aria-label={`Vai a ${props.appTitle}`}>
            <span className="landing-kicker">Comfort workspace</span>
            <strong>{props.appTitle}</strong>
          </a>

          <nav className="landing-site-nav" aria-label="Navigazione principale">
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="landing-header-actions">
          <span className="landing-version-chip">Versione {props.appVersion}</span>
          <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
            Guida ERS
          </button>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri Studio
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" id="landing-home">
          <div className="landing-hero-copy">
            <p className="landing-hero-eyebrow">Pagina introduttiva semplice e reale</p>
            <h1>Uno studio piu comodo, piu chiaro e pronto al lavoro serio.</h1>
            <p className="landing-hero-lead">
              La home introduce l&apos;app in modo netto e senza confusione. Quando entri nello studio trovi un
              ambiente piu rilassato, con layout ordinato, colori morbidi e focus immediato sul diagramma.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
                Entra nello Studio
              </button>
              <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                Apri la guida codice
              </button>
              <a className="landing-secondary-link" href="#landing-workspace">
                Scopri il redesign
              </a>
            </div>

            <div className="landing-stat-row">
              <div>
                <strong>Workspace comodo</strong>
                <span>Pannelli piu ariosi, header leggibile e una gerarchia pensata per lavorare a lungo.</span>
              </div>
              <div>
                <strong>Vista affiancata utile</strong>
                <span>Canvas e codice convivono meglio, senza la sensazione di schermi sovraccarichi.</span>
              </div>
              <div>
                <strong>Palette piu calma</strong>
                <span>Contrasti professionali ma morbidi, adatti a una sessione di modellazione continua.</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-side">
            <article className="landing-preview-card">
              <div className="landing-preview-stage" aria-hidden="true">
                <div className="preview-node preview-entity preview-entity-left">PERSONA</div>
                <div className="preview-node preview-relationship">ASSEGNA</div>
                <div className="preview-node preview-entity preview-entity-right">PROGETTO</div>
                <div className="preview-node preview-attribute preview-attribute-left">Matricola</div>
                <div className="preview-node preview-attribute preview-attribute-right">Budget</div>
                <span className="preview-line preview-line-left" />
                <span className="preview-line preview-line-right" />
                <span className="preview-line preview-line-attribute-left" />
                <span className="preview-line preview-line-attribute-right" />
                <span className="preview-cardinality preview-cardinality-left">(1,N)</span>
                <span className="preview-cardinality preview-cardinality-right">(0,N)</span>
              </div>

              <div className="landing-preview-copy">
                <span className="landing-preview-label">Anteprima workspace</span>
                <p>
                  Un ambiente orientato al lavoro: superfici chiare, pannelli meno pesanti e un canvas che torna a
                  essere il centro operativo.
                </p>
              </div>
            </article>

            <div className="landing-aside-grid">
              <article className="landing-release-card">
                <span className="landing-release-label">Ultimo rilascio</span>
                <strong>
                  {props.appTitle} {props.latestRelease.version}
                </strong>
                <p>{props.latestRelease.date}</p>
                <ul>
                  {props.latestRelease.updates.slice(0, 3).map((update) => (
                    <li key={update}>{update}</li>
                  ))}
                </ul>
              </article>

              <article className="landing-route-card">
                <span className="landing-proof-kicker">Routine consigliata</span>
                <ol className="landing-route-list">
                  <li>Leggi la panoramica iniziale.</li>
                  <li>Apri lo studio nella vista piu adatta.</li>
                  <li>Usa canvas, inspector e ERS con meno attrito visivo.</li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-workspace">
          <div className="landing-section-heading">
            <span>Workspace</span>
            <h2>Il redesign punta a farti lavorare comodo, non soltanto a rendere l&apos;app piu bella.</h2>
            <p className="landing-section-lead">
              La pagina iniziale diventa piu pulita e il vero cambiamento prosegue dentro lo studio: piu ordine,
              meno tensione visiva e strumenti che si leggono piu velocemente.
            </p>
          </div>

          <div className="landing-about-layout">
            <article className="landing-spotlight-card">
              <span className="landing-kicker">Obiettivo del nuovo layout</span>
              <h3>Creare un ambiente di lavoro comodo, coerente e semplice da capire.</h3>
              <p>
                L&apos;interfaccia separa meglio introduzione e lavoro operativo. La landing accompagna, lo studio
                esegue. Questa distinzione rende il percorso piu naturale fin dal primo click.
              </p>
              <p>
                Dentro lo studio il layout usa spaziatura piu stabile, pannelli meno rigidi e una palette che aiuta a
                concentrarsi sul diagramma invece che sull&apos;interfaccia stessa.
              </p>
            </article>

            <div className="landing-card-grid">
              {WORKSPACE_PILLARS.map((item) => (
                <article key={item.title} className="landing-info-card">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-flow">
          <div className="landing-section-heading">
            <span>Flusso</span>
            <h2>Un percorso breve: capire l&apos;app, entrare nello studio, lavorare bene.</h2>
            <p className="landing-section-lead">
              La nuova home resta essenziale e porta subito verso lo spazio operativo, senza le tante sezioni da sito
              vetrina che rallentano il passaggio al lavoro vero.
            </p>
          </div>

          <div className="landing-docs-layout">
            <div className="landing-tutorial-grid">
              {WORKFLOW_STEPS.map((item) => (
                <article key={item.step} className="landing-step-card">
                  <span className="landing-step-number">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <article className="landing-code-card">
              <div className="landing-code-head">
                <span className="landing-kicker">Codice ERS</span>
                <strong>Una guida chiara resta a un click</strong>
              </div>
              <pre>{ERS_PREVIEW}</pre>
              <p>
                Se preferisci modellare da tastiera, la guida alla modalita codice resta facilmente raggiungibile dalla
                landing e dalla workspace.
              </p>
              <div className="landing-inline-actions">
                <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                  Apri la guida completa
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <span className="landing-kicker">Pronto a modellare</span>
            <h2>Apri {props.appTitle} e lavora in uno studio piu semplice, piu calmo e piu leggibile.</h2>
          </div>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Vai allo Studio
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <span className="landing-kicker">{props.appTitle}</span>
            <p>Una home essenziale per presentare l&apos;app e un workspace ridisegnato per lavorare con piu comfort.</p>
          </div>

          <div className="landing-footer-links">
            <strong>Navigazione</strong>
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="landing-footer-links">
            <strong>Versione</strong>
            <span>{props.latestRelease.version}</span>
            <span>{props.latestRelease.date}</span>
          </div>

          <div className="landing-footer-cta">
            <span className="landing-version-chip">Versione {props.appVersion}</span>
            <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
              Apri lo Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
