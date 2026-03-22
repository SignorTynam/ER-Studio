import type { AppChangelogEntry } from "../utils/appMeta";

interface LandingPageProps {
  appTitle: string;
  appVersion: string;
  latestRelease: AppChangelogEntry;
  onOpenStudio: () => void;
  onOpenCodeTutorial: () => void;
}

const NAV_ITEMS = [
  { label: "Pagina Principale", href: "#landing-home" },
  { label: "About", href: "#landing-about" },
  { label: "Documentation", href: "#landing-documentation" },
  { label: "Tutorial", href: "#landing-tutorial" },
  { label: "Servizi", href: "#landing-services" },
];

const ABOUT_PILLARS = [
  {
    title: "Introduzione leggibile",
    text:
      "La pagina iniziale spiega subito cosa fa l'app, per chi e stata pensata e quali percorsi usare prima di entrare nel canvas.",
  },
  {
    title: "Navigazione chiara",
    text:
      "Navbar, sezioni ancorate e CTA coerenti aiutano a passare da overview, documentazione e tutorial senza perdersi.",
  },
  {
    title: "Stessa identita visiva",
    text:
      "Il linguaggio visivo resta coerente con lo studio: superfici morbide, tipografia editoriale e contrasti netti dove servono.",
  },
];

const DOCUMENTATION_AREAS = [
  {
    eyebrow: "Prodotto",
    title: "Overview dell'app",
    points: [
      "Home pubblica per capire il prodotto prima di aprire l'editor.",
      "Studio operativo separato, pensato per modellare senza distrazioni.",
      "Release e versione sempre visibili nel percorso iniziale.",
    ],
  },
  {
    eyebrow: "Code",
    title: "Documentation del codice",
    points: [
      "Modalita Code con sincronizzazione live tra sorgente ERS e canvas.",
      "Errori di parsing mostrati in modo diretto durante la scrittura.",
      "Rigenerazione del sorgente dal diagramma corrente in un click.",
    ],
  },
  {
    eyebrow: "Formato",
    title: "Sintassi ERS e modello",
    points: [
      "Entita, relazioni, attributi e cardinalita nel flusso base.",
      "Supporto per identificatori interni, composti ed esterni.",
      "Export PNG, SVG e JSON per consegna, review o presentazione.",
    ],
  },
];

const TUTORIAL_STEPS = [
  {
    step: "01",
    title: "Apri il canvas solo quando serve",
    text:
      "Usa la landing per orientarti, poi entra nello studio con una CTA sempre visibile e senza menu nascosti.",
  },
  {
    step: "02",
    title: "Disegna il modello base",
    text:
      "Aggiungi entita, relazioni e attributi; il lessico Chen e gia il centro dell'interfaccia.",
  },
  {
    step: "03",
    title: "Rifinisci con inspector e code mode",
    text:
      "Controlla cardinalita, identificatori e sorgente ERS con un flusso lineare, non frammentato.",
  },
  {
    step: "04",
    title: "Esporta e presenta",
    text:
      "Quando il modello e pronto puoi esportarlo o riaprirlo in seguito con una struttura chiara e consistente.",
  },
];

const SERVICE_AREAS = [
  {
    title: "About del prodotto",
    text:
      "Una sezione pensata per raccontare il valore dell'app, i casi d'uso principali e la differenza tra presentazione e workspace.",
    tag: "orientamento",
  },
  {
    title: "Documentation integrata",
    text:
      "Spazio dedicato a flusso, formato ERS, code mode e release notes: utile sia per chi usa l'app sia per chi la studia.",
    tag: "codice",
  },
  {
    title: "Tutorial operativo",
    text:
      "Percorso a step per passare dalla prima visita alla modellazione, con esempi semplici e call to action coerenti.",
    tag: "onboarding",
  },
  {
    title: "Servizi di lavoro",
    text:
      "Canvas, export, validazione e revisione sono presentati come parti di un unico ecosistema, non come funzioni sparse.",
    tag: "workflow",
  },
];

const FOOTER_LINKS = [
  { label: "Home", href: "#landing-home" },
  { label: "About", href: "#landing-about" },
  { label: "Documentation", href: "#landing-documentation" },
  { label: "Tutorial", href: "#landing-tutorial" },
  { label: "Servizi", href: "#landing-services" },
];

export function LandingPage(props: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-site-header">
        <div className="landing-header-main">
          <a className="landing-brand-link" href="#landing-home" aria-label={`Vai a ${props.appTitle}`}>
            <span className="landing-kicker">Official App</span>
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
            Tutorial Code Mode
          </button>
          <a className="landing-secondary-link" href="#landing-documentation">
            Documentation
          </a>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri Studio
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" id="landing-home">
          <div className="landing-hero-copy">
            <p className="landing-hero-eyebrow">Landing page + workspace operativo</p>
            <h1>ER Diagram Studio, spiegato bene prima di aprire il canvas.</h1>
            <p className="landing-hero-lead">
              La pagina iniziale diventa una vera introduzione dell&apos;app: racconta il prodotto, guida alla
              documentazione, mostra il tutorial e porta nello studio solo quando l&apos;utente e pronto.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
                Entra nello Studio
              </button>
              <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                Tutorial Code Mode
              </button>
              <a className="landing-secondary-link" href="#landing-about">
                Scopri il prodotto
              </a>
            </div>

            <div className="landing-stat-row">
              <div>
                <strong>Chen-first canvas</strong>
                <span>modellazione concettuale chiara, senza adattare editor generici.</span>
              </div>
              <div>
                <strong>Code + Diagram live</strong>
                <span>ERS sincronizzato con il canvas durante la scrittura valida.</span>
              </div>
              <div>
                <strong>Export e review</strong>
                <span>PNG, SVG, JSON e rilascio leggibile fin dalla home.</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-side">
            <article className="landing-preview-card">
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

              <div className="landing-preview-copy">
                <span className="landing-preview-label">Preview</span>
                <p>
                  Un canvas focalizzato sul modello concettuale, con nodi chiari, collegamenti naturali e un percorso
                  semplice tra introduzione, studio e documentazione.
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
                <span className="landing-proof-kicker">Percorso consigliato</span>
                <ol className="landing-route-list">
                  <li>Leggi l&apos;overview del prodotto.</li>
                  <li>Apri Documentation e Tutorial dalla navbar.</li>
                  <li>Entra nello studio con il contesto gia chiaro.</li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-about">
          <div className="landing-section-heading">
            <span>About</span>
            <h2>La home presenta il prodotto come sito, non come semplice splash screen.</h2>
            <p className="landing-section-lead">
              L&apos;obiettivo e far capire subito cos&apos;e ER Diagram Studio, perche esiste e quale strada seguire:
              informarsi, approfondire il codice, fare onboarding e poi modellare.
            </p>
          </div>

          <div className="landing-about-layout">
            <article className="landing-spotlight-card">
              <span className="landing-kicker">Perche funziona</span>
              <h3>Un ingresso piu user friendly, coerente con il tono editoriale dell&apos;app.</h3>
              <p>
                La pagina usa una struttura da prodotto: hero, sezioni informative, documentazione, tutorial, servizi
                e footer. Il visitatore capisce subito cosa aspettarsi e dove cliccare.
              </p>
              <p>
                Lo studio resta il cuore operativo, ma la landing ora lo introduce nel modo corretto invece di
                somigliare a un layout incompleto o troppo tecnico.
              </p>
            </article>

            <div className="landing-card-grid">
              {ABOUT_PILLARS.map((item) => (
                <article key={item.title} className="landing-info-card">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-documentation">
          <div className="landing-section-heading">
            <span>Documentation</span>
            <h2>Documentazione del prodotto e del codice, leggibile direttamente dalla home.</h2>
            <p className="landing-section-lead">
              Questa sezione crea un ponte tra chi vuole usare l&apos;app e chi vuole capirne meglio il comportamento,
              il flusso ERS e la logica del workspace.
            </p>
          </div>

          <div className="landing-docs-layout">
            <div className="landing-doc-grid">
              {DOCUMENTATION_AREAS.map((item) => (
                <article key={item.title} className="landing-doc-card">
                  <span>{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <article className="landing-code-card">
              <div className="landing-code-head">
                <span className="landing-kicker">ERS snippet</span>
                <strong>Documentation per il codice</strong>
              </div>
              <pre>{`entity Studente
  attribute Matricola key
  attribute Nome

entity Corso
  attribute Cfu

relationship Frequenta between Studente and Corso
  cardinality Studente (0,N)
  cardinality Corso (1,N)`}</pre>
              <p>
                Il codice ERS e parte del racconto del prodotto: la landing lo introduce, il Code Mode lo rende
                operativo, e il canvas lo traduce in diagramma.
              </p>
              <div className="landing-inline-actions">
                <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                  Apri guida completa
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section" id="landing-tutorial">
          <div className="landing-section-heading">
            <span>Tutorial</span>
            <h2>Un onboarding in quattro passi, senza frizioni.</h2>
            <p className="landing-section-lead">
              Invece di lasciare l&apos;utente da solo davanti al canvas, la pagina guida il primo approccio con step
              concreti e progressivi.
            </p>
          </div>

          <div className="landing-tutorial-grid">
            {TUTORIAL_STEPS.map((item) => (
              <article key={item.step} className="landing-step-card">
                <span className="landing-step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="landing-inline-actions">
            <button type="button" className="landing-primary-button" onClick={props.onOpenCodeTutorial}>
              Vai al tutorial Code Mode
            </button>
          </div>
        </section>

        <section className="landing-section" id="landing-services">
          <div className="landing-section-heading">
            <span>Servizi</span>
            <h2>Le aree chiave dell&apos;esperienza sono esplicitate come servizi del prodotto.</h2>
            <p className="landing-section-lead">
              Ogni blocco della home indirizza a un bisogno diverso: capire l&apos;app, leggere il comportamento del
              codice, seguire il tutorial o passare al lavoro operativo.
            </p>
          </div>

          <div className="landing-service-grid">
            {SERVICE_AREAS.map((item) => (
              <article key={item.title} className="landing-service-card">
                <span className="landing-service-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-final-cta">
          <div>
            <span className="landing-kicker">Ready to model</span>
            <h2>Apri ER Diagram Studio quando vuoi passare dall&apos;introduzione al lavoro vero.</h2>
          </div>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri ER Studio
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <span className="landing-kicker">ER Diagram Studio</span>
            <p>
              Una landing introduttiva piu chiara, con navbar, documentazione, tutorial, servizi e accesso rapido al
              workspace.
            </p>
          </div>

          <div className="landing-footer-links">
            <strong>Navigazione</strong>
            {FOOTER_LINKS.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="landing-footer-links">
            <strong>Release</strong>
            <span>{props.latestRelease.version}</span>
            <span>{props.latestRelease.date}</span>
            <a href="#landing-documentation">Apri Documentation</a>
          </div>

          <div className="landing-footer-cta">
            <span className="landing-version-chip">Versione {props.appVersion}</span>
            <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
              Vai allo Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
