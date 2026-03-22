import type { AppChangelogEntry } from "../utils/appMeta";

interface LandingPageProps {
  appTitle: string;
  appVersion: string;
  latestRelease: AppChangelogEntry;
  onOpenStudio: () => void;
  onOpenCodeTutorial: () => void;
}

const NAV_ITEMS = [
  { label: "Inizio", href: "#landing-home" },
  { label: "Presentazione", href: "#landing-about" },
  { label: "Documentazione", href: "#landing-documentation" },
  { label: "Tutorial", href: "#landing-tutorial" },
  { label: "Funzioni", href: "#landing-services" },
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
      "Navbar, sezioni ancorate e CTA coerenti aiutano a passare da panoramica, documentazione e tutorial senza perdersi.",
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
    title: "Panoramica dell'app",
    points: [
      "Pagina iniziale pubblica per capire il prodotto prima di aprire l'editor.",
      "Studio operativo separato, pensato per modellare senza distrazioni.",
      "Rilascio e versione sempre visibili nel percorso iniziale.",
    ],
  },
  {
    eyebrow: "Modalita codice",
    title: "Documentazione del codice",
    points: [
      "Modalita codice con sincronizzazione live tra sorgente ERS e canvas.",
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
      "Esporta PNG, SVG e JSON per consegna, revisione o presentazione.",
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
    title: "Rifinisci con ispettore e modalita codice",
    text:
      "Controlla cardinalita, identificatori e sorgente ERS con ispettore e modalita codice in un flusso lineare.",
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
    title: "Presentazione del prodotto",
    text:
      "Una sezione pensata per raccontare il valore dell'app, i casi d'uso principali e la differenza tra presentazione e spazio di lavoro.",
    tag: "orientamento",
  },
  {
    title: "Documentazione integrata",
    text:
      "Spazio dedicato a flusso, formato ERS, modalita codice e note di rilascio: utile sia per chi usa l'app sia per chi la studia.",
    tag: "codice",
  },
  {
    title: "Tutorial operativo",
    text:
      "Percorso a step per passare dalla prima visita alla modellazione, con esempi semplici e call to action coerenti.",
    tag: "avvio",
  },
  {
    title: "Servizi di lavoro",
    text:
      "Canvas, esportazione, validazione e revisione sono presentati come parti di un unico ecosistema, non come funzioni sparse.",
    tag: "flusso",
  },
];

const FOOTER_LINKS = [
  { label: "Inizio", href: "#landing-home" },
  { label: "Presentazione", href: "#landing-about" },
  { label: "Documentazione", href: "#landing-documentation" },
  { label: "Tutorial", href: "#landing-tutorial" },
  { label: "Funzioni", href: "#landing-services" },
];

export function LandingPage(props: LandingPageProps) {
  return (
    <div className="landing-shell">
      <header className="landing-site-header">
        <div className="landing-header-main">
          <a className="landing-brand-link" href="#landing-home" aria-label={`Vai a ${props.appTitle}`}>
            <span className="landing-kicker">Applicazione ufficiale</span>
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
            Guida alla modalita codice
          </button>
          <a className="landing-secondary-link" href="#landing-documentation">
            Documentazione
          </a>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri Studio
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" id="landing-home">
          <div className="landing-hero-copy">
            <p className="landing-hero-eyebrow">Sito introduttivo e spazio operativo</p>
            <h1>{props.appTitle}, spiegato bene prima di aprire il canvas.</h1>
            <p className="landing-hero-lead">
              La pagina iniziale diventa una vera introduzione dell&apos;app: racconta il prodotto, guida alla
              documentazione, mostra il tutorial e porta nello studio solo quando l&apos;utente e pronto.
            </p>

            <div className="landing-cta-row">
              <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
                Entra nello Studio
              </button>
              <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                Guida alla modalita codice
              </button>
              <a className="landing-secondary-link" href="#landing-about">
                Scopri il prodotto
              </a>
            </div>

            <div className="landing-stat-row">
              <div>
                <strong>Canvas Chen nativo</strong>
                <span>Modellazione concettuale chiara, senza adattare editor generici.</span>
              </div>
              <div>
                <strong>Codice e diagramma sincronizzati</strong>
                <span>ERS allineato al canvas durante la scrittura valida.</span>
              </div>
              <div>
                <strong>Esportazione e revisione</strong>
                <span>PNG, SVG, JSON e note di rilascio leggibili fin dalla pagina iniziale.</span>
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
                <span className="landing-preview-label">Anteprima</span>
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
                  <li>Leggi la panoramica del prodotto.</li>
                  <li>Apri documentazione e tutorial dalla barra superiore.</li>
                  <li>Entra nello studio con il contesto gia chiaro.</li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-about">
          <div className="landing-section-heading">
            <span>Presentazione</span>
            <h2>La pagina iniziale presenta il prodotto come sito, non come semplice splash screen.</h2>
            <p className="landing-section-lead">
              L&apos;obiettivo e far capire subito cos&apos;e {props.appTitle}, perche esiste e quale strada seguire:
              informarsi, approfondire il codice, orientarsi e poi modellare.
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
            <span>Documentazione</span>
            <h2>Documentazione del prodotto e del codice, leggibile direttamente dalla pagina iniziale.</h2>
            <p className="landing-section-lead">
              Questa sezione crea un ponte tra chi vuole usare l&apos;app e chi vuole capirne meglio il comportamento,
              il flusso ERS e la logica dello spazio di lavoro.
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
                <span className="landing-kicker">Snippet ERS</span>
                <strong>Documentazione per il codice</strong>
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
                Il codice ERS e parte del racconto del prodotto: la pagina iniziale lo introduce, la modalita codice lo rende
                operativo, e il canvas lo traduce in diagramma.
              </p>
              <div className="landing-inline-actions">
                <button type="button" className="landing-secondary-link" onClick={props.onOpenCodeTutorial}>
                  Apri la guida completa
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section" id="landing-tutorial">
          <div className="landing-section-heading">
            <span>Tutorial</span>
            <h2>Un percorso guidato in quattro passi, senza frizioni.</h2>
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
              Vai al tutorial della modalita codice
            </button>
          </div>
        </section>

        <section className="landing-section" id="landing-services">
          <div className="landing-section-heading">
            <span>Funzioni</span>
            <h2>Le aree chiave dell&apos;esperienza sono esplicitate come servizi del prodotto.</h2>
            <p className="landing-section-lead">
              Ogni blocco della pagina iniziale indirizza a un bisogno diverso: capire l&apos;app, leggere il comportamento del
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
            <span className="landing-kicker">Pronto a modellare</span>
            <h2>Apri {props.appTitle} quando vuoi passare dall&apos;introduzione al lavoro vero.</h2>
          </div>
          <button type="button" className="landing-primary-button" onClick={props.onOpenStudio}>
            Apri ER Studio
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <span className="landing-kicker">{props.appTitle}</span>
            <p>
              Una landing introduttiva piu chiara, con navbar, documentazione, tutorial, servizi e accesso rapido al
              spazio operativo.
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
            <strong>Rilascio</strong>
            <span>{props.latestRelease.version}</span>
            <span>{props.latestRelease.date}</span>
            <a href="#landing-documentation">Apri documentazione</a>
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
