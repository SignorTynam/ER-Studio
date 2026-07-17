const builderLogoUrl = new URL("../../image/buildER no text no background.png", import.meta.url).href;

interface WorkspaceBrandLogoProps {
  className?: string;
}

/**
 * Fase D1: logo puramente decorativo — affianca sempre il nome dell'app come
 * testo, quindi annunciarlo sarebbe ridondante. Il div non aveva un ruolo e
 * l'aria-label su di esso era vietato (axe: aria-prohibited-attr).
 */
export function WorkspaceBrandLogo({ className }: WorkspaceBrandLogoProps = {}) {
  return (
    <div className={["workspace-welcome-logo", className].filter(Boolean).join(" ")}>
      <img src={builderLogoUrl} alt="" aria-hidden="true" />
    </div>
  );
}
