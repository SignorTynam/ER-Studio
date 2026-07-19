import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../../components/icons/StudioIcon";
import type { SqlPlaygroundErrorPayload } from "./sqlPlaygroundProtocol";

export function SqlPlaygroundError({ error }: { error: SqlPlaygroundErrorPayload }) {
  const { t } = useI18n();
  const mainKey = error.operation === "initialize"
    ? "sqlPlayground.errors.initialization"
    : error.operation === "create-schema" || error.operation === "reset"
      ? "sqlPlayground.errors.schema"
      : error.operation === "export"
        ? "sqlPlayground.errors.export"
        : "sqlPlayground.errors.query";
  return (
    <section className="sql-playground-error" aria-live="polite" aria-atomic="true">
      <StudioIcon name="warning" aria-hidden="true" />
      <div>
        <strong>{t(mainKey)}</strong>
        <p>{error.message}</p>
        {typeof error.statementIndex === "number" ? (
          <small>{t("sqlPlayground.errors.statement", { count: error.statementIndex + 1 })}</small>
        ) : null}
      </div>
    </section>
  );
}
