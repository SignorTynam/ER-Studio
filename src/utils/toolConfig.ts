import type { ToolKind } from "../types/diagram";

export interface ToolDefinition {
  tool: ToolKind;
  label: string;
  shortcut: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { tool: "move", label: "Sposta", shortcut: "s" },
  { tool: "select", label: "Selezione", shortcut: "v" },
  { tool: "delete", label: "Cancella", shortcut: "x" },
  { tool: "entity", label: "Entita", shortcut: "e" },
  { tool: "relationship", label: "Relazione", shortcut: "r" },
  { tool: "attribute", label: "Attributo", shortcut: "a" },
  { tool: "connector", label: "Collegamento", shortcut: "c" },
  { tool: "inheritance", label: "Generalizzazione", shortcut: "g" },
  { tool: "text", label: "Testo libero", shortcut: "t" },
];

export const TOOL_BY_SHORTCUT: Record<string, ToolKind> = TOOL_DEFINITIONS.reduce(
  (result, item) => {
    result[item.shortcut] = item.tool;
    return result;
  },
  {} as Record<string, ToolKind>,
);

export const TOOL_LABEL_BY_KIND: Record<ToolKind, string> = TOOL_DEFINITIONS.reduce(
  (result, item) => {
    result[item.tool] = item.label;
    return result;
  },
  {} as Record<ToolKind, string>,
);
