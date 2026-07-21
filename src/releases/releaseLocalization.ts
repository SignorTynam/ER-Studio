import type { MessageKey, TranslationParams } from "../i18n";
import type { AppReleaseDefinition, LocalizedAppRelease, LocalizedReleaseHighlight, ReleaseChangeKind } from "./releaseTypes";

export type ReleaseTranslator = (key: MessageKey, params?: TranslationParams) => string;

const CHANGE_KINDS: ReleaseChangeKind[] = ["added", "changed", "fixed"];

function localizeDetailedRelease(release: AppReleaseDefinition, t: ReleaseTranslator): LocalizedAppRelease {
  const baseKey = `changelog.entries.${release.contentKey}`;
  const highlights: LocalizedReleaseHighlight[] = (release.highlightKeys ?? []).map((key) => ({
    title: t(`${baseKey}.highlights.${key}.title`),
    description: t(`${baseKey}.highlights.${key}.description`),
    tag: t(`${baseKey}.highlights.${key}.tag`),
  }));
  const updates = Array.from({ length: release.updateCount ?? 0 }, (_, index) =>
    t(`${baseKey}.updates.${index}`),
  );
  const localizedSections = CHANGE_KINDS.reduce<Record<ReleaseChangeKind, string[]>>((result, kind) => {
    result[kind] = (release.sections?.[kind] ?? [])
      .map((index) => updates[Number(index)])
      .filter((value): value is string => Boolean(value));
    return result;
  }, { added: [], changed: [], fixed: [] });

  return {
    ...release,
    headline: t(`${baseKey}.headline`, { version: release.version }),
    summary: t(`${baseKey}.summary`, { version: release.version }),
    heroContent: release.hero ? {
      eyebrow: t(`${baseKey}.hero.eyebrow`),
      title: t(`${baseKey}.hero.title`),
      subtitle: t(`${baseKey}.hero.subtitle`),
    } : undefined,
    highlights,
    localizedSections,
    changes: CHANGE_KINDS.flatMap((kind) => localizedSections[kind]),
  };
}

function localizeLegacyRelease(release: AppReleaseDefinition, t: ReleaseTranslator): LocalizedAppRelease {
  const changes = Array.from({ length: Math.min(release.updateCount ?? 3, 4) }, (_, index) =>
    t(`changelog.entries.generic.updates.${index}`, { version: release.version }),
  );
  return {
    ...release,
    headline: t("releases.legacy.headline", { version: release.version }),
    summary: t("releases.legacy.summary", { version: release.version }),
    highlights: [],
    localizedSections: { added: [], changed: changes, fixed: [] },
    changes,
  };
}

export function localizeRelease(release: AppReleaseDefinition, t: ReleaseTranslator): LocalizedAppRelease {
  return release.contentKey ? localizeDetailedRelease(release, t) : localizeLegacyRelease(release, t);
}

export function localizeReleaseCatalog(catalog: readonly AppReleaseDefinition[], t: ReleaseTranslator): LocalizedAppRelease[] {
  return catalog.map((release) => localizeRelease(release, t));
}
