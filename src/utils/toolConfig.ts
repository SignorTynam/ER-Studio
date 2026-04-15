import type { ToolKind } from "../types/diagram";
import { translate } from "../i18n";

export interface ToolDefinition {
  tool: ToolKind;
  label: string;
  shortcut: string;
}

const TOOL_DEFINITION_CONFIG: Array<{ tool: ToolKind; labelKey: Parameters<typeof translate>[0]; shortcut: string }> =
  [
    { tool: "move", labelKey: "toolbar.tools.move", shortcut: "s" },
    { tool: "select", labelKey: "toolbar.tools.select", shortcut: "v" },
    { tool: "delete", labelKey: "toolbar.tools.delete", shortcut: "x" },
    { tool: "entity", labelKey: "toolbar.tools.entity", shortcut: "e" },
    { tool: "relationship", labelKey: "toolbar.tools.relationship", shortcut: "r" },
    { tool: "attribute", labelKey: "toolbar.tools.attribute", shortcut: "a" },
    { tool: "connector", labelKey: "toolbar.tools.connector", shortcut: "c" },
    { tool: "inheritance", labelKey: "toolbar.tools.inheritance", shortcut: "g" },
  ];

export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITION_CONFIG.map((item) => ({
    tool: item.tool,
    label: translate(item.labelKey),
    shortcut: item.shortcut,
  }));
}

export const TOOL_BY_SHORTCUT: Record<string, ToolKind> = TOOL_DEFINITION_CONFIG.reduce(
  (result, item) => {
    result[item.shortcut] = item.tool;
    return result;
  },
  {} as Record<string, ToolKind>,
);

export function getToolLabelsByKind(): Record<ToolKind, string> {
  return getToolDefinitions().reduce(
    (result, item) => {
      result[item.tool] = item.label;
      return result;
    },
    {} as Record<ToolKind, string>,
  );
}

export function getToolLabel(tool: ToolKind): string {
  return getToolLabelsByKind()[tool];
}
