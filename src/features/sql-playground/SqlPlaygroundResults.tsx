import { useI18n } from "../../i18n/useI18n";
import { formatSqlResultValue } from "../../utils/sqlPlayground";
import type { SqlStatementResult } from "./sqlPlaygroundProtocol";

function ResultTable({ result }: { result: SqlStatementResult }) {
  const { t } = useI18n();
  return (
    <>
      <div className="sql-playground-table-scroll" tabIndex={0} aria-label={t("sqlPlayground.results.tableScrollLabel")}>
        <table>
          <thead>
            <tr>
              {result.columns.map((column, index) => (
                <th key={`${column}-${index}`} scope="col">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => {
                  const formatted = formatSqlResultValue(value);
                  return (
                    <td key={columnIndex} className={`sql-playground-cell sql-playground-cell--${formatted.kind}`}>
                      <span title={formatted.fullValue}>{formatted.display}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.length === 0 ? <p className="sql-playground-result__empty">{t("sqlPlayground.results.noRows")}</p> : null}
      {result.truncated ? <p className="sql-playground-result__limit">{t("sqlPlayground.results.limit")}</p> : null}
    </>
  );
}

function StatementSummary({ result }: { result: SqlStatementResult }) {
  const { t } = useI18n();
  return (
    <dl className="sql-playground-statement-summary">
      <div><dt>{t("sqlPlayground.results.status")}</dt><dd>{t("sqlPlayground.results.completed")}</dd></div>
      <div><dt>{t("sqlPlayground.results.changedRows")}</dt><dd>{result.changes}</dd></div>
      {result.lastInsertRowId ? <div><dt>{t("sqlPlayground.results.lastInsertId")}</dt><dd>{result.lastInsertRowId}</dd></div> : null}
      <div><dt>{t("sqlPlayground.results.duration")}</dt><dd>{t("sqlPlayground.results.durationValue", { value: result.durationMs.toFixed(1) })}</dd></div>
    </dl>
  );
}

export function SqlPlaygroundResults({ results }: { results: SqlStatementResult[] }) {
  const { t } = useI18n();
  return (
    <section className="sql-playground-results" aria-labelledby="sql-playground-results-title">
      <div className="sql-playground-section-heading">
        <div>
          <h2 id="sql-playground-results-title">{t("sqlPlayground.results.title")}</h2>
          <p>{results.length > 0 ? t("sqlPlayground.results.statementCount", { count: results.length }) : t("sqlPlayground.results.empty")}</p>
        </div>
      </div>
      <div className="sql-playground-results__content">
        {results.length === 0 ? (
          <div className="sql-playground-results__empty-state">{t("sqlPlayground.results.emptyDescription")}</div>
        ) : results.map((result) => (
          <article key={result.statementIndex} className="sql-playground-result">
            <header>
              <h3>{t("sqlPlayground.results.statement", { count: result.statementIndex + 1 })}</h3>
              <code title={result.sql}>{result.sql}</code>
            </header>
            {result.kind === "rows" ? <ResultTable result={result} /> : <StatementSummary result={result} />}
          </article>
        ))}
      </div>
    </section>
  );
}
