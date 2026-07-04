import type { VersionHighlightKind } from "../types/diagram";

export const DIAGRAM_VERSION_ADDED = "var(--diagram-version-added, #2a8a5f)";
export const DIAGRAM_VERSION_REMOVED = "var(--diagram-version-removed, #c44536)";
export const DIAGRAM_VERSION_MODIFIED = "var(--diagram-version-modified, #b5850a)";
export const DIAGRAM_VERSION_LAYOUT = "var(--diagram-version-layout, #b5850a)";

export function getVersionHighlightStroke(highlight?: VersionHighlightKind): string | undefined {
  if (highlight === "added") return DIAGRAM_VERSION_ADDED;
  if (highlight === "removed") return DIAGRAM_VERSION_REMOVED;
  if (highlight === "modified") return DIAGRAM_VERSION_MODIFIED;
  if (highlight === "layout") return DIAGRAM_VERSION_LAYOUT;
  return undefined;
}
