export type CommandPaletteEntryKind = "file" | "command";

export interface CommandPaletteSearchEntry {
  id: string;
  kind: CommandPaletteEntryKind;
  label: string;
  detail?: string;
  category: string;
  shortcut?: string;
  path?: string;
  fileType?: string;
  extension?: string;
  disabled?: boolean;
  active?: boolean;
  open?: boolean;
  order: number;
}

export function normalizeCommandPaletteText(value: string, locale: string): string {
  return value
    .trim()
    .toLocaleLowerCase(locale)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function tokenizeCommandPaletteQuery(value: string, locale: string): string[] {
  const normalized = normalizeCommandPaletteText(value, locale);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

interface RankedEntry<T> {
  entry: T;
  score: number;
}

function normalizedWords(value: string): string[] {
  return value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Predictable substring ranking for the command palette.
 *
 * Exact label/name > label prefix > word prefix > label substring > file path
 * > detail/category/type/extension/shortcut. Small active/open bonuses never
 * outweigh a stronger textual match. Ties are deterministic.
 */
export function rankCommandPaletteEntries<T extends CommandPaletteSearchEntry>(
  entries: readonly T[],
  query: string,
  locale: string,
): T[] {
  const normalizedQuery = normalizeCommandPaletteText(query, locale);
  const tokens = tokenizeCommandPaletteQuery(query, locale);

  if (tokens.length === 0) {
    return [...entries].sort((left, right) =>
      left.order - right.order ||
      left.label.localeCompare(right.label, locale, { sensitivity: "base", numeric: true }) ||
      left.id.localeCompare(right.id),
    );
  }

  const ranked = entries.flatMap((entry): RankedEntry<T>[] => {
    const label = normalizeCommandPaletteText(entry.label, locale);
    const path = normalizeCommandPaletteText(entry.path ?? "", locale);
    const detail = normalizeCommandPaletteText(entry.detail ?? "", locale);
    const category = normalizeCommandPaletteText(entry.category, locale);
    const fileType = normalizeCommandPaletteText(entry.fileType ?? "", locale);
    const extension = normalizeCommandPaletteText(entry.extension ?? "", locale);
    const shortcut = normalizeCommandPaletteText(entry.shortcut ?? "", locale);
    const fields = [label, path, detail, category, fileType, extension, shortcut];

    if (!tokens.every((token) => fields.some((field) => field.includes(token)))) {
      return [];
    }

    let score = 300;
    if (label === normalizedQuery) {
      score = 1000;
    } else if (label.startsWith(normalizedQuery)) {
      score = 900;
    } else if (normalizedWords(label).some((word) => word.startsWith(normalizedQuery))) {
      score = 800;
    } else if (label.includes(normalizedQuery)) {
      score = 700;
    } else if (path.includes(normalizedQuery)) {
      score = 600;
    } else if (detail.includes(normalizedQuery)) {
      score = 500;
    } else if ([category, fileType, extension, shortcut].some((field) => field.includes(normalizedQuery))) {
      score = 400;
    }

    if (entry.active) score += 24;
    if (entry.open) score += 12;
    return [{ entry, score }];
  });

  return ranked
    .sort((left, right) =>
      right.score - left.score ||
      left.entry.order - right.entry.order ||
      left.entry.label.localeCompare(right.entry.label, locale, { sensitivity: "base", numeric: true }) ||
      left.entry.id.localeCompare(right.entry.id),
    )
    .map(({ entry }) => entry);
}
