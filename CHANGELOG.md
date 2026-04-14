# Changelog

Tutte le modifiche importanti del progetto saranno documentate in questo file.

Il formato segue le linee guida di Keep a Changelog e la versione del progetto segue Semantic Versioning.

## [Unreleased]

### Added
- Inserire qui nuove funzionalita non ancora rilasciate.

### Changed
- Inserire qui modifiche a funzionalita esistenti.

### Fixed
- Inserire qui bug fix.

## [3.6.0] - 2026-04-14

### Added
- Aggiunta interazione diretta sul backbone degli identificatori interni composti con drag del gruppo membro come unita logica.

### Changed
- Rendering identificatori interni composti rifattorizzato in geometria ortogonale: backbone comune e rami lineari.
- Eliminato il routing curvo del backbone composito.
- Posizione del backbone calcolata automaticamente in base al lato entita, bounding box e distribuzione attributi membri.
- Distribuzione dei rami resa deterministica con spaziatura minima per evitare sovrapposizioni e incroci inutili.
- Recompute del layout composito stabilizzato durante move entita/attributi, aggiunta o rimozione membri e reload.

### Fixed
- Rimossi i collegamenti diagonali duplicati dei membri composti sopprimendo gli edge diretti attributo-entita quando e attivo il gruppo composito.
- Introdotti stem ortogonali entita-backbone per mantenere una lettura unica e pulita della struttura.

## [3.5.0] - 2026-04-14

### Added
- Aggiunto `security.md` con una prima policy per la segnalazione responsabile delle vulnerabilita.
- Aggiunto `LICENSE` con licenza MIT per definire i diritti d'uso del codice.
- Aggiunto `CONTRIBUTING.md` con linee guida su setup locale, naming branch, PR e standard di codice.
- Aggiunto il tracciamento del changelog tramite `CHANGELOG.md`.
- Aggiunta in `src/types/diagram.ts` la tipizzazione `EntityRelationshipParticipation` e il campo opzionale `relationshipParticipations` sugli entity node.
- Aggiunto in `src/types/diagram.ts` il campo opzionale `cardinality` sugli attribute node.
- Aggiunte in `src/utils/cardinality.ts` utility per normalizzazione e risoluzione della cardinalita di connector e attribute edge.

### Changed
- In `src/types/diagram.ts` i connector edge usano ora `participationId` invece del campo testuale `cardinality`.
- In `src/types/diagram.ts` la cardinalita degli attribute edge non e piu salvata direttamente sull'edge ma risolta dal nodo attributo.
- In `src/utils/cardinality.ts` la lettura della cardinalita e stata centralizzata tramite `getEdgeCardinalityValue` e `getEdgeCardinalityLabel`.
- In `src/inspector/InspectorPanel.tsx` rimossa la card "Impostazioni associazione": la rinomina resta disponibile tramite azioni rapide.

### Fixed
- Nessuna correzione registrata in questa release.

## [3.4.0] - 2026-04-14

### Added
- Creato il file CHANGELOG.md per tracciare le modifiche per release.
