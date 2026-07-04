import { useI18n } from "../../i18n/useI18n";

const builderLogoUrl = new URL("../../image/buildER no text no background.png", import.meta.url).href;

export function WorkspaceBrandLogo() {
  const { t } = useI18n();

  return (
    <div className="workspace-welcome-logo" aria-label={t("workspaceWelcome.logoAria")}>
      <img src={builderLogoUrl} alt="" aria-hidden="true" />
    </div>
  );
}
