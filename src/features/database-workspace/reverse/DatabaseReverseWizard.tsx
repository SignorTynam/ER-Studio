import { useEffect, useMemo, useState } from "react";
import { SqlReverseErPreview } from "../../../components/SqlReverseErPreview";
import { SqlReverseLogicalPreview } from "../../../components/SqlReverseLogicalPreview";
import { StudioIcon } from "../../../components/icons/StudioIcon";
import { Button, Field, Modal } from "../../../components/ui";
import { useI18n } from "../../../i18n/useI18n";
import type { SelectionState, Viewport } from "../../../types/diagram";
import type { LogicalSelection } from "../../../types/logical";
import { createEmptyErTranslationWorkspace } from "../../../utils/erTranslation";
import { createEmptyLogicalWorkspace, updateLogicalWorkspaceModel } from "../../../utils/logicalWorkspace";
import type { SqlPlaygroundManager } from "../../sql-playground/SqlPlaygroundManager";
import type { ImportedSqlDatabaseSessionState } from "../../sql-playground/sqlPlaygroundState";
import type {
  DatabaseReverseApplyReport,
  DatabaseReverseApplyRequest,
  DatabaseReverseDestination,
} from "../databaseWorkspaceTypes";
import { sanitizeSqliteFileName } from "../importedDatabaseFile";
import { buildSqliteReverseAnalysis, getSqliteTableId } from "./sqliteMetadataToSqlSchemaModel";

const INITIAL_VIEWPORT: Viewport = { x: 180, y: 110, zoom: 1 };
const INITIAL_LOGICAL_SELECTION: LogicalSelection = { nodeId: null, columnId: null, edgeId: null };
const INITIAL_ER_SELECTION: SelectionState = { nodeIds: [], edgeIds: [] };

interface DatabaseReverseWizardProps {
  manager: SqlPlaygroundManager;
  session: ImportedSqlDatabaseSessionState;
  hasProject: boolean;
  hasActiveSchema: boolean;
  onClose: () => void;
  onApply: (request: DatabaseReverseApplyRequest) => Promise<DatabaseReverseApplyReport | null>;
}

function stripDatabaseExtension(fileName: string): string {
  return sanitizeSqliteFileName(fileName).replace(/\.(?:sqlite3?|db)$/i, "") || "database";
}

export function DatabaseReverseWizard(props: DatabaseReverseWizardProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [metadata, setMetadata] = useState<Awaited<ReturnType<SqlPlaygroundManager["reverseDatabase"]>> | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inferManyToMany, setInferManyToMany] = useState(true);
  const [keepForeignKeys, setKeepForeignKeys] = useState(true);
  const [includeExtras, setIncludeExtras] = useState(true);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState<DatabaseReverseDestination>(
    props.hasProject ? "current-project-new-schema" : "new-project",
  );
  const baseName = stripDatabaseExtension(props.session.fileName);
  const [schemaFileName, setSchemaFileName] = useState(`${baseName}-reverse.erschema`);
  const [projectName, setProjectName] = useState(`${baseName}-reverse`);
  const [logicalViewport, setLogicalViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [logicalSelection, setLogicalSelection] = useState<LogicalSelection>(INITIAL_LOGICAL_SELECTION);
  const [erViewport, setErViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [erSelection, setErSelection] = useState<SelectionState>(INITIAL_ER_SELECTION);
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<DatabaseReverseApplyReport | null>(null);

  async function refreshAnalysis(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const next = await props.manager.reverseDatabase(props.session.sessionId);
      setMetadata(next);
      const available = next.metadata.databases.flatMap((database) => database.tables
        .filter((table) => !table.virtual)
        .map((table) => getSqliteTableId(database.name, table.name)));
      setSelectedIds((current) => current.length > 0 ? current.filter((id) => available.includes(id)) : available);
      setStale(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("databaseWorkspace.reverse.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshAnalysis(); }, [props.session.sessionId]);

  useEffect(() => props.manager.subscribe((event) => {
    if (event.type === "schema-changed" && event.sessionId === props.session.sessionId) setStale(true);
  }), [props.manager, props.session.sessionId]);

  const result = useMemo(() => {
    if (!metadata || selectedIds.length === 0) return null;
    return buildSqliteReverseAnalysis({
      sessionId: props.session.sessionId,
      fileName: props.session.fileName,
      fileSize: props.session.fileSize,
      schemaSignature: metadata.schemaSignature,
      metadata: metadata.metadata,
      options: {
        selectedTableIds: selectedIds,
        inferManyToManyTables: inferManyToMany,
        keepForeignKeyColumnsAsAttributes: keepForeignKeys,
        includeUnconvertedDefinitions: includeExtras,
      },
    });
  }, [includeExtras, inferManyToMany, keepForeignKeys, metadata, props.session.fileName, props.session.fileSize, props.session.sessionId, selectedIds]);

  const logicalWorkspace = useMemo(() => {
    if (!result) return null;
    const translation = createEmptyErTranslationWorkspace(result.diagram);
    return updateLogicalWorkspaceModel(
      translation.translatedDiagram,
      createEmptyLogicalWorkspace(translation.translatedDiagram),
      result.logicalModel,
    );
  }, [result]);

  const tables = metadata?.metadata.databases.flatMap((database) => database.tables.map((table) => ({
    id: getSqliteTableId(database.name, table.name),
    name: table.name,
    databaseName: database.name,
    virtual: table.virtual,
  }))) ?? [];
  const viewCount = metadata?.metadata.databases.reduce((sum, database) => sum + database.views.length, 0) ?? 0;
  const indexCount = metadata?.metadata.databases.reduce((sum, database) => sum + database.indexes.length, 0) ?? 0;
  const triggerCount = metadata?.metadata.databases.reduce((sum, database) => sum + database.triggers.length, 0) ?? 0;
  const foreignKeyCount = metadata?.metadata.databases.reduce(
    (sum, database) => sum + database.tables.reduce((tableSum, table) => tableSum + new Set(table.foreignKeys.map((key) => key.id)).size, 0),
    0,
  ) ?? 0;
  const visibleStep = step === 5 ? 4 : step;
  const progressSteps = [
    t("databaseWorkspace.reverse.analysis"),
    t("databaseWorkspace.reverse.logicalPreview"),
    t("databaseWorkspace.reverse.erPreview"),
    t("databaseWorkspace.reverse.destination"),
  ];

  async function apply(): Promise<void> {
    if (!result || stale) return;
    setApplying(true);
    setError("");
    try {
      const nextReport = await props.onApply({
        destination,
        schemaFileName,
        projectName,
        includeUnconvertedDefinitions: includeExtras,
        result,
      });
      if (nextReport) {
        setReport(nextReport);
        setStep(5);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("databaseWorkspace.reverse.error"));
    } finally {
      setApplying(false);
    }
  }

  const footer = step === 5 ? (
    <Button variant="primary" onClick={props.onClose}>{t("databaseWorkspace.reverse.openSchema")}</Button>
  ) : (
    <>
      <Button variant="secondary" onClick={props.onClose}>{t("common.actions.cancel")}</Button>
      {step > 1 ? <Button variant="secondary" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>{t("sqlReverse.preview.back")}</Button> : null}
      {step < 4 ? (
        <Button variant="primary" disabled={loading || stale || selectedIds.length === 0 || !result} onClick={() => setStep((step + 1) as 2 | 3 | 4)}>
          {t("common.actions.continue")}
        </Button>
      ) : (
        <Button variant="primary" loading={applying} disabled={stale || !schemaFileName.trim() || (destination === "new-project" && !projectName.trim())} onClick={() => void apply()}>
          {t("databaseWorkspace.reverse.apply")}
        </Button>
      )}
    </>
  );

  return (
    <Modal
      open
      onClose={props.onClose}
      title={t("databaseWorkspace.reverse.title")}
      subtitle={t("databaseWorkspace.reverse.step", { current: step === 5 ? 4 : step, total: 4 })}
      size="lg"
      busy={applying}
      className="database-reverse-wizard"
      footer={footer}
    >
      <div className="database-reverse-wizard__body" aria-live="polite">
        <ol className="database-reverse-progress" aria-label={t("databaseWorkspace.reverse.title")}>
          {progressSteps.map((label, index) => {
            const number = index + 1;
            const complete = step === 5 || number < visibleStep;
            const current = step !== 5 && number === visibleStep;
            return (
              <li
                key={label}
                className={complete ? "is-complete" : current ? "is-current" : undefined}
                aria-current={current ? "step" : undefined}
              >
                <span className="database-reverse-progress__marker" aria-hidden="true">
                  {complete ? <StudioIcon name="done" /> : number}
                </span>
                <span className="database-reverse-progress__label">{label}</span>
              </li>
            );
          })}
        </ol>
        {stale ? (
          <div className="database-reverse-wizard__stale" role="alert">
            <strong>{t("databaseWorkspace.reverse.structureChanged")}</strong>
            <Button size="sm" variant="secondary" iconLeft="refresh" onClick={() => void refreshAnalysis()}>{t("databaseWorkspace.reverse.refreshAnalysis")}</Button>
          </div>
        ) : null}
        {error ? <div className="sql-playground-error" role="alert">{error}</div> : null}
        {loading ? <div className="sql-explorer-loading" role="status"><span className="ui-button__spinner" aria-hidden="true" />{t("databaseWorkspace.reverse.analyzing")}</div> : null}
        {!loading && step === 1 ? (
          <section className="database-reverse-analysis" aria-label={t("databaseWorkspace.reverse.analysis") }>
            <dl className="database-reverse-summary">
              <div><dt>{t("databaseWorkspace.reverse.database")}</dt><dd>{props.session.fileName}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.size")}</dt><dd>{props.session.fileSize.toLocaleString()} B</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.tables")}</dt><dd>{tables.length}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.views")}</dt><dd>{viewCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.foreignKeys")}</dt><dd>{foreignKeyCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.indexes")}</dt><dd>{indexCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.triggers")}</dt><dd>{triggerCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.warnings")}</dt><dd>{result?.issues.length ?? 0}</dd></div>
            </dl>
            <div className="database-reverse-section-card database-reverse-table-selection">
              <div className="database-reverse-selection-actions">
                <strong>{t("databaseWorkspace.reverse.selectedTables", { count: selectedIds.length })}</strong>
                <span className="database-reverse-selection-actions__buttons">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(tables.filter((table) => !table.virtual).map((table) => table.id))}>{t("databaseWorkspace.reverse.selectAll")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>{t("databaseWorkspace.reverse.deselectAll")}</Button>
                </span>
              </div>
              <div className="database-reverse-table-list">
                {tables.map((table) => (
                  <label key={table.id} className={selectedIds.includes(table.id) ? "is-selected" : undefined}>
                    <input type="checkbox" checked={selectedIds.includes(table.id)} disabled={table.virtual} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, table.id] : current.filter((id) => id !== table.id))} />
                    <span>{table.databaseName}.{table.name}</span>
                    {table.virtual ? <small>{t("databaseWorkspace.reverse.virtualTable")}</small> : null}
                  </label>
                ))}
              </div>
            </div>
            <fieldset className="database-reverse-options">
              <legend>{t("databaseWorkspace.reverse.options")}</legend>
              <label><input type="checkbox" checked={inferManyToMany} onChange={(event) => setInferManyToMany(event.target.checked)} />{t("databaseWorkspace.reverse.inferManyToMany")}</label>
              <label><input type="checkbox" checked={keepForeignKeys} onChange={(event) => setKeepForeignKeys(event.target.checked)} />{t("databaseWorkspace.reverse.keepForeignKeys")}</label>
              {(result?.unconvertedDefinitions.length ?? 0) > 0 ? <label><input type="checkbox" checked={includeExtras} onChange={(event) => setIncludeExtras(event.target.checked)} />{t("databaseWorkspace.reverse.includeExtras")}</label> : null}
            </fieldset>
          </section>
        ) : null}
        {!loading && step === 2 && result && logicalWorkspace ? (
          <section className="database-reverse-preview database-reverse-preview--logical sql-reverse-preview-shell-logical" aria-label={t("databaseWorkspace.reverse.logicalPreview")}>
            <SqlReverseLogicalPreview sourceDiagram={result.diagram} workspace={logicalWorkspace} viewport={logicalViewport} selection={logicalSelection} fitRequestToken={1} onViewportChange={setLogicalViewport} onSelectionChange={setLogicalSelection} />
          </section>
        ) : null}
        {!loading && step === 3 && result ? (
          <section className="database-reverse-preview database-reverse-preview--er sql-reverse-preview-shell-er" aria-label={t("databaseWorkspace.reverse.erPreview")}>
            <SqlReverseErPreview diagram={result.diagram} viewport={erViewport} selection={erSelection} onViewportChange={setErViewport} onSelectionChange={setErSelection} />
          </section>
        ) : null}
        {!loading && step === 4 ? (
          <section className="database-reverse-destination" aria-label={t("databaseWorkspace.reverse.destination")}>
            <fieldset>
              <legend>{t("databaseWorkspace.reverse.destination")}</legend>
              {props.hasProject ? (
                <label className={`database-reverse-choice${destination === "current-project-new-schema" ? " is-selected" : ""}`}>
                  <input type="radio" name="destination" value="current-project-new-schema" checked={destination === "current-project-new-schema"} onChange={() => setDestination("current-project-new-schema")} />
                  <StudioIcon name="schema" aria-hidden="true" />
                  <span>{t("databaseWorkspace.reverse.currentProjectNewSchema")}</span>
                </label>
              ) : null}
              <label className={`database-reverse-choice${destination === "new-project" ? " is-selected" : ""}`}>
                <input type="radio" name="destination" value="new-project" checked={destination === "new-project"} onChange={() => setDestination("new-project")} />
                <StudioIcon name="newProject" aria-hidden="true" />
                <span>{t("databaseWorkspace.reverse.newProject")}</span>
              </label>
              {props.hasProject && props.hasActiveSchema ? (
                <label className={`database-reverse-choice${destination === "replace-current-schema" ? " is-selected" : ""}`}>
                  <input type="radio" name="destination" value="replace-current-schema" checked={destination === "replace-current-schema"} onChange={() => setDestination("replace-current-schema")} />
                  <StudioIcon name="refresh" aria-hidden="true" />
                  <span>{t("databaseWorkspace.reverse.replaceCurrentSchema")}</span>
                </label>
              ) : null}
            </fieldset>
            <div className="database-reverse-destination__fields">
              <Field label={t("databaseWorkspace.reverse.schemaName")} className="database-reverse-field">
                {({ id }) => <input id={id} value={schemaFileName} onChange={(event) => setSchemaFileName(event.target.value)} />}
              </Field>
              {destination === "new-project" ? (
                <Field label={t("databaseWorkspace.reverse.projectName")} className="database-reverse-field">
                  {({ id }) => <input id={id} value={projectName} onChange={(event) => setProjectName(event.target.value)} />}
                </Field>
              ) : null}
            </div>
          </section>
        ) : null}
        {step === 5 && report ? (
          <section className="database-reverse-complete" role="status">
            <div className="database-reverse-complete__hero">
              <span className="database-reverse-complete__icon" aria-hidden="true"><StudioIcon name="success" /></span>
              <div>
                <h3>{t("databaseWorkspace.reverse.completed")}</h3>
                <p>{t("databaseWorkspace.reverse.createdSchema")}: <strong>{report.schemaFileName}</strong></p>
              </div>
            </div>
            <dl>
              <div><dt>{t("databaseWorkspace.reverse.createdSchema")}</dt><dd>{report.schemaFileName}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.convertedTables")}</dt><dd>{report.tableCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.createdEntities")}</dt><dd>{report.entityCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.createdRelationships")}</dt><dd>{report.relationshipCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.warnings")}</dt><dd>{report.warningCount}</dd></div>
              <div><dt>{t("databaseWorkspace.reverse.preservedDefinitions")}</dt><dd>{report.preservedDefinitionCount}</dd></div>
            </dl>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
