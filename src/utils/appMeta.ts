export const APP_NAME = "ER Diagram Studio";
export const APP_VERSION = "1.0";
export const APP_TITLE = `${APP_NAME}`;

export interface AppChangelogEntry {
  version: string;
  date: string;
  updates: string[];
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: "1.0",
    date: "2026-03-13",
    updates: [
      "Rinominato il menu Aiuto in About.",
      "Aggiunto il pulsante New con storico aggiornamenti.",
      "Introdotto versioning applicazione: ER Diagram Studio 1.0.",
      "Migliorata la resa attributi: cardinalita opzionale, etichetta dinamica e connessioni lineari.",
    ],
  },
];
