import type { AppChangelogEntry } from "../utils/appMeta";

interface LandingPageProps {
  appTitle: string;
  appVersion: string;
  latestRelease: AppChangelogEntry;
  onOpenStudio: () => void;
}

const VALUE_PROPS = [
  {
    title: "Pensato per Chen",
    description:
      "Entita, relazioni, attributi e cardinalita con un lessico visivo coerente, senza adattare tool generici.",
  },
  {
    title: "Identificatori avanzati",
    description:
      "Supporto per identificatori interni, composti ed esterni, con un workflow orientato alla didattica e alla progettazione.",
  },
  {
    title: "Pulito da mostrare",
    description:
      "Linee piu naturali, export immediato e canvas focalizzato sul modello concettuale, non sull'interfaccia.",
  },
];

const STORY_POINTS = [
  {
    title: "Spiega il modello, non il software",
    text:
      "La home presenta il prodotto. Lo studio entra in scena solo quando vuoi progettare davvero.",
  },
  {
    title: "Riduce il rumore operativo",
    text:
      "Inserimento rapido, modifica diretta e controlli chiari per arrivare prima a un diagramma leggibile.",
  },
  {
    title: "Costruito per revisione e presentazione",
    text:
      "L'output e pensato per tesi, esami, documentazione e spiegazioni in aula o in meeting tecnici.",
  },
];

const WORKFLOW = [
  "Imposta entita, relazioni e attributi sul canvas.",
  "Collega i nodi e definisci cardinalita, generalizzazioni e identificatori.",
  "Rifinisci il layout ed esporta PNG, SVG o JSON del modello.",
];

export function LandingPage(props: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="landing-brand-block">
          <span className="landing-kicker">Official App</span>
          <strong>{props.appTitle}</strong>
        </div>

        <div className="landing-header-actions">
          <span className="landing-version-chip">Versione {props.appVersion}</span>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri Studio
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-hero-eyebrow">ER diagram studio for concept design</p>
            <h1>La pagina ufficiale per capire subito cos'e ER Studio e perche usarlo.</h1>
            <p className="landing-hero-lead">
              ER Diagram Studio e un editor dedicato ai diagrammi ER in stile Chen. Serve a progettare modelli
              concettuali con una resa leggibile, rigorosa e pronta da presentare.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
                Entra Nell&apos;App
              </button>
              <a className="landing-secondary-link" href="#landing-story">
                Scopri il prodotto
              </a>
            </div>

            <div className="landing-stat-row">
              <div>
                <strong>Chen-first</strong>
                <span>nativo nel linguaggio del diagramma</span>
              </div>
              <div>
                <strong>JSON + PNG + SVG</strong>
                <span>salvataggio, revisione ed export immediati</span>
              </div>
              <div>
                <strong>Workflow guidato</strong>
                <span>anche per identificatori esterni e composti</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-preview-card">
              <div className="landing-preview-stage" aria-hidden="true">
                <div className="preview-node preview-entity preview-entity-left">STUDENTE</div>
                <div className="preview-node preview-relationship">FREQUENTA</div>
                <div className="preview-node preview-entity preview-entity-right">CORSO</div>
                <div className="preview-node preview-attribute preview-attribute-left">MATRICOLA</div>
                <div className="preview-node preview-attribute preview-attribute-right">CFU</div>
                <span className="preview-line preview-line-left" />
                <span className="preview-line preview-line-right" />
                <span className="preview-line preview-line-attribute-left" />
                <span className="preview-line preview-line-attribute-right" />
                <span className="preview-cardinality preview-cardinality-left">(0,N)</span>
                <span className="preview-cardinality preview-cardinality-right">(1,N)</span>
              </div>
              <p>
                Un canvas focalizzato sul modello concettuale, con nodi chiari, collegamenti naturali e strumenti
                adatti alla spiegazione.
              </p>
            </div>

            <div className="landing-release-card">
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
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-story">
          <div className="landing-section-heading">
            <span>Perche esiste</span>
            <h2>Una pagina pubblica per raccontare il prodotto, poi uno studio operativo per progettare.</h2>
          </div>

          <div className="landing-story-grid">
            {STORY_POINTS.map((item) => (
              <article key={item.title} className="landing-story-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading compact">
            <span>Cosa fa</span>
            <h2>Le funzioni importanti sono gia nel flusso base.</h2>
          </div>

          <div className="landing-value-grid">
            {VALUE_PROPS.map((item) => (
              <article key={item.title} className="landing-value-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-process-section">
          <div className="landing-process-card">
            <div className="landing-section-heading compact">
              <span>Workflow</span>
              <h2>Dall&apos;idea al diagramma esportabile in tre passaggi.</h2>
            </div>

            <ol className="landing-process-list">
              {WORKFLOW.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="landing-proof-panel">
            <span className="landing-proof-kicker">Per chi e</span>
            <p>
              Studenti, docenti, analisti e chiunque debba spiegare relazioni tra dati in modo piu chiaro di un
              wireframe improvvisato.
            </p>
            <p>
              La landing racconta il valore del prodotto. Lo studio resta un ambiente dedicato, senza distrazioni e
              pronto all&apos;uso.
            </p>
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <span className="landing-kicker">Ready to model</span>
            <h2>Apri lo studio e inizia a costruire il diagramma.</h2>
          </div>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri ER Studio
          </button>
        </section>
      </main>
    </div>
  );
}
