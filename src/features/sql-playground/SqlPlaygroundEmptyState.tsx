import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../../components/icons/StudioIcon";
import { Button } from "../../components/ui";

export function SqlPlaygroundEmptyState({ stale, onGenerate }: { stale: boolean; onGenerate: () => void }) {
  const { t } = useI18n();
  return (
    <section className="sql-playground-empty">
      <StudioIcon name={stale ? "refresh" : "database"} aria-hidden="true" />
      <h1>{stale ? t("sqlPlayground.empty.staleTitle") : t("sqlPlayground.empty.title")}</h1>
      <p>{stale ? t("sqlPlayground.empty.staleDescription") : t("sqlPlayground.empty.description")}</p>
      <Button variant="primary" iconLeft="refresh" onClick={onGenerate}>
        {stale ? t("sqlPlayground.empty.update") : t("sqlPlayground.empty.generate")}
      </Button>
    </section>
  );
}
