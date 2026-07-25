import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".playwright-cli",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "playwright-report",
  "test-results",
]);

const COLOR_PATTERNS = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /\brgba?\([^)]*\)/gi,
  hsl: /\bhsla?\([^)]*\)/gi,
  colorMix: /\bcolor-mix\(/gi,
} as const;

const VISUAL_PROPERTY_PATTERNS = {
  spacing: /^(?:gap|row-gap|column-gap|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|inset|top|right|bottom|left)$/,
  dimension:
    /^(?:width|height|min-width|min-height|max-width|max-height|flex-basis|border(?:-(?:top|right|bottom|left))?-width|stroke-width)$/,
  radius: /^border(?:-(?:top-left|top-right|bottom-left|bottom-right))?-radius$/,
  fontSize: /^font-size$/,
} as const;

const LENGTH_LITERAL = /-?(?:\d*\.)?\d+(?:px|rem|em|ch|ex|vh|vw|vmin|vmax|%|pt|pc|cm|mm|in)\b/gi;
const ALIAS_PREFIX = /^--(?:studio|editor|panel)-/;
const THEME_MARKER = /(?:--unibo-|--ui-|data-theme|\.theme[-_])/i;

type ColorCategory = keyof typeof COLOR_PATTERNS;
type VisualCategory = keyof typeof VISUAL_PROPERTY_PATTERNS;

export interface AuditLocation {
  file: string;
  line: number;
}

export interface ColorLiteral extends AuditLocation {
  category: ColorCategory;
  value: string;
}

export interface VisualLiteral extends AuditLocation {
  category: VisualCategory;
  property: string;
  value: string;
}

export interface ShadowLiteral extends AuditLocation {
  property: string;
  value: string;
}

export interface VariableDeclaration extends AuditLocation {
  name: string;
  value: string;
}

export interface VariableReference extends AuditLocation {
  name: string;
  hasFallback: boolean;
}

export interface CssTokenAudit {
  generatedFrom: {
    cssFiles: string[];
    runtimeFiles: string[];
    supportFiles: string[];
    tokenSource: string;
  };
  summary: {
    cssFileCount: number;
    colorLiterals: number;
    rawColorLiterals: number;
    colorMixConstructs: number;
    colorLiteralsOutsideTokenSource: number;
    rawColorLiteralsOutsideTokenSource: number;
    shadowDeclarations: number;
    svgShadowReferences: number;
    visualLiterals: Record<VisualCategory, number>;
    variableDeclarations: number;
    variableReferences: number;
    duplicateVariableNames: number;
    missingVariableReferences: number;
    missingVariableReferencesWithoutFallback: number;
    aliasDeclarations: number;
    aliasesWithoutConsumers: number;
    selectorClasses: number;
    potentiallyDeadClasses: number;
    unimportedCssFiles: number;
  };
  perFile: Array<{
    file: string;
    colors: Record<ColorCategory, number>;
    shadows: number;
    svgShadows: number;
    visualLiterals: Record<VisualCategory, number>;
  }>;
  colors: ColorLiteral[];
  shadows: ShadowLiteral[];
  svgShadows: AuditLocation[];
  visualLiterals: VisualLiteral[];
  repeatedVisualValues: Array<{
    category: VisualCategory;
    value: string;
    count: number;
    locations: AuditLocation[];
  }>;
  duplicateVariables: Array<{ name: string; declarations: VariableDeclaration[] }>;
  missingVariables: Array<{ name: string; references: VariableReference[] }>;
  aliases: Array<{
    name: string;
    declarations: VariableDeclaration[];
    consumerCount: number;
  }>;
  potentiallyDeadClasses: Array<{
    name: string;
    cssLocations: AuditLocation[];
    supportReferenceCount: number;
  }>;
  themeMarkers: AuditLocation[];
  cssImports: {
    ordered: string[];
    unimported: string[];
  };
  manualReview: string[];
  limitations: string[];
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function walkFiles(root: string, directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : walkFiles(root, absolute);
    }
    return entry.isFile() ? [normalizePath(relative(root, absolute))] : [];
  });
}

const LINE_STARTS_CACHE = new Map<string, number[]>();

function lineNumberAt(source: string, index: number): number {
  let starts = LINE_STARTS_CACHE.get(source);
  if (!starts) {
    starts = [0];
    for (let cursor = 0; cursor < source.length; cursor += 1) {
      if (source.charCodeAt(cursor) === 10) starts.push(cursor + 1);
    }
    LINE_STARTS_CACHE.set(source, starts);
  }

  let low = 0;
  let high = starts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= index) low = middle + 1;
    else high = middle;
  }
  return low;
}

function stripCommentsPreservingLines(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

function emptyColorCounts(): Record<ColorCategory, number> {
  return { hex: 0, rgb: 0, hsl: 0, colorMix: 0 };
}

function emptyVisualCounts(): Record<VisualCategory, number> {
  return { spacing: 0, dimension: 0, radius: 0, fontSize: 0 };
}

function sortLocations<T extends AuditLocation>(items: T[]): T[] {
  return items.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenAppears(source: string, token: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(token)}([^A-Za-z0-9_-]|$)`, "m").test(source);
}

function selectorClassLocations(file: string, source: string): Map<string, AuditLocation[]> {
  const classes = new Map<string, AuditLocation[]>();
  let segmentStart = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "}") {
      segmentStart = index + 1;
      continue;
    }
    if (character !== "{") continue;

    const prelude = source.slice(segmentStart, index).trim();
    segmentStart = index + 1;
    if (!prelude || prelude.startsWith("@") || prelude.includes(": ")) continue;
    const line = lineNumberAt(source, Math.max(segmentStart - prelude.length - 1, 0));
    for (const match of prelude.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
      const name = match[1];
      const locations = classes.get(name) ?? [];
      if (!locations.some((location) => location.file === file && location.line === line)) {
        locations.push({ file, line });
      }
      classes.set(name, locations);
    }
  }
  return classes;
}

function mergeClassLocations(target: Map<string, AuditLocation[]>, source: Map<string, AuditLocation[]>): void {
  for (const [name, locations] of source) {
    target.set(name, [...(target.get(name) ?? []), ...locations]);
  }
}

function cssImports(root: string): string[] {
  const mainPath = resolve(root, "src/main.tsx");
  if (!existsSync(mainPath)) return [];
  return [...readFileSync(mainPath, "utf8").matchAll(/import\s+["'](\.\/[^"']+\.css)["'];/g)]
    .map((match) => normalizePath(`src/${match[1].replace(/^\.\//, "")}`));
}

export function auditCssTokens(root = process.cwd()): CssTokenAudit {
  const allFiles = walkFiles(root, root).sort();
  const cssFiles = allFiles.filter((file) => file === "src/index.css" || /^src\/styles\/.+\.css$/.test(file));
  const runtimeFiles = allFiles.filter(
    (file) => /^(?:index\.html|src\/.+\.(?:ts|tsx|html))$/.test(file) && !file.endsWith(".d.ts"),
  );
  const supportFiles = allFiles.filter((file) => /^(?:docs|test|tests)\//.test(file) && /\.(?:md|ts|tsx|html)$/.test(file));
  const runtimeCorpus = runtimeFiles.map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
  const supportCorpus = supportFiles.map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
  const tokenSource = "src/styles/tokens.css";

  const colors: ColorLiteral[] = [];
  const shadows: ShadowLiteral[] = [];
  const svgShadows: AuditLocation[] = [];
  const visualLiterals: VisualLiteral[] = [];
  const declarations = new Map<string, VariableDeclaration[]>();
  const references = new Map<string, VariableReference[]>();
  const selectorClasses = new Map<string, AuditLocation[]>();
  const themeMarkers: AuditLocation[] = [];
  const perFile: CssTokenAudit["perFile"] = [];

  for (const file of runtimeFiles) {
    const source = readFileSync(resolve(root, file), "utf8");
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/\bstyle\s*=/.test(line)) continue;
      for (const match of line.matchAll(/["'](--[\w-]+)["']\s*:/g)) {
        const item = { name: match[1], value: "<runtime inline style>", file, line: index + 1 };
        declarations.set(item.name, [...(declarations.get(item.name) ?? []), item]);
      }
    }
  }

  for (const file of cssFiles) {
    const rawSource = readFileSync(resolve(root, file), "utf8");
    const source = stripCommentsPreservingLines(rawSource);
    const fileColors = emptyColorCounts();
    const fileVisuals = emptyVisualCounts();
    let fileShadows = 0;
    let fileSvgShadows = 0;

    for (const [category, pattern] of Object.entries(COLOR_PATTERNS) as Array<[ColorCategory, RegExp]>) {
      for (const match of source.matchAll(pattern)) {
        const literal = {
          category,
          file,
          line: lineNumberAt(source, match.index ?? 0),
          value: category === "colorMix" ? "color-mix(" : match[0].toLowerCase().replace(/\s+/g, ""),
        };
        colors.push(literal);
        fileColors[category] += 1;
      }
    }

    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lineNumber = index + 1;
      const declaration = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
      if (declaration) {
        const item = { name: declaration[1], value: declaration[2].trim(), file, line: lineNumber };
        declarations.set(item.name, [...(declarations.get(item.name) ?? []), item]);
      }

      for (const reference of line.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        const item = { name: reference[1], hasFallback: Boolean(reference[2]), file, line: lineNumber };
        references.set(item.name, [...(references.get(item.name) ?? []), item]);
      }

      const propertyDeclaration = line.match(/^\s*([\w-]+)\s*:\s*([^;]+);/);
      if (propertyDeclaration && !propertyDeclaration[1].startsWith("--")) {
        const property = propertyDeclaration[1].toLowerCase();
        const value = propertyDeclaration[2].trim();
        for (const [category, pattern] of Object.entries(VISUAL_PROPERTY_PATTERNS) as Array<
          [VisualCategory, RegExp]
        >) {
          if (!pattern.test(property)) continue;
          for (const literal of value.match(LENGTH_LITERAL) ?? []) {
            visualLiterals.push({ category, property, value: literal.toLowerCase(), file, line: lineNumber });
            fileVisuals[category] += 1;
          }
        }
        if (/^(?:box-shadow|text-shadow|filter)$/.test(property) && /(?:shadow|drop-shadow)/.test(`${property}:${value}`)) {
          shadows.push({ property, value, file, line: lineNumber });
          fileShadows += 1;
        }
      }

      if (THEME_MARKER.test(line)) themeMarkers.push({ file, line: lineNumber });
      if (/(?:drop-shadow\(|filter:\s*url\()/.test(line)) {
        svgShadows.push({ file, line: lineNumber });
        fileSvgShadows += 1;
      }
    }

    mergeClassLocations(selectorClasses, selectorClassLocations(file, source));
    perFile.push({
      file,
      colors: fileColors,
      shadows: fileShadows,
      svgShadows: fileSvgShadows,
      visualLiterals: fileVisuals,
    });
  }

  for (const file of runtimeFiles.filter((candidate) => candidate.endsWith(".tsx"))) {
    const source = readFileSync(resolve(root, file), "utf8");
    for (const match of source.matchAll(/(?:<feDropShadow\b|drop-shadow\(|filter:\s*url\()/g)) {
      svgShadows.push({ file, line: lineNumberAt(source, match.index ?? 0) });
    }
  }

  const repeatedGroups = new Map<string, VisualLiteral[]>();
  for (const literal of visualLiterals) {
    const key = `${literal.category}\0${literal.value}`;
    repeatedGroups.set(key, [...(repeatedGroups.get(key) ?? []), literal]);
  }
  const repeatedVisualValues = [...repeatedGroups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      category: key.split("\0")[0] as VisualCategory,
      value: key.split("\0")[1],
      count: items.length,
      locations: sortLocations(items.map(({ file, line }) => ({ file, line }))),
    }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category) || left.value.localeCompare(right.value));

  const duplicateVariables = [...declarations.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([name, items]) => ({ name, declarations: sortLocations(items) }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const missingVariables = [...references.entries()]
    .filter(([name]) => !declarations.has(name))
    .map(([name, items]) => ({ name, references: sortLocations(items) }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const aliases = [...declarations.entries()]
    .filter(([name]) => ALIAS_PREFIX.test(name))
    .map(([name, items]) => ({
      name,
      declarations: sortLocations(items),
      consumerCount: references.get(name)?.length ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const potentiallyDeadClasses = [...selectorClasses.entries()]
    .filter(([name]) => !tokenAppears(runtimeCorpus, name))
    .map(([name, locations]) => ({
      name,
      cssLocations: sortLocations(locations),
      supportReferenceCount: tokenAppears(supportCorpus, name) ? 1 : 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const orderedImports = cssImports(root);
  const unimported = cssFiles.filter((file) => !orderedImports.includes(file)).sort();
  const visualCounts = emptyVisualCounts();
  for (const item of visualLiterals) visualCounts[item.category] += 1;
  const missingWithoutFallback = missingVariables.flatMap((item) => item.references).filter((item) => !item.hasFallback);

  return {
    generatedFrom: { cssFiles, runtimeFiles, supportFiles, tokenSource },
    summary: {
      cssFileCount: cssFiles.length,
      colorLiterals: colors.length,
      rawColorLiterals: colors.filter((item) => item.category !== "colorMix").length,
      colorMixConstructs: colors.filter((item) => item.category === "colorMix").length,
      colorLiteralsOutsideTokenSource: colors.filter((item) => item.file !== tokenSource).length,
      rawColorLiteralsOutsideTokenSource: colors.filter(
        (item) => item.file !== tokenSource && item.category !== "colorMix",
      ).length,
      shadowDeclarations: shadows.length,
      svgShadowReferences: svgShadows.length,
      visualLiterals: visualCounts,
      variableDeclarations: [...declarations.values()].reduce((total, items) => total + items.length, 0),
      variableReferences: [...references.values()].reduce((total, items) => total + items.length, 0),
      duplicateVariableNames: duplicateVariables.length,
      missingVariableReferences: missingVariables.flatMap((item) => item.references).length,
      missingVariableReferencesWithoutFallback: missingWithoutFallback.length,
      aliasDeclarations: aliases.length,
      aliasesWithoutConsumers: aliases.filter((alias) => alias.consumerCount === 0).length,
      selectorClasses: selectorClasses.size,
      potentiallyDeadClasses: potentiallyDeadClasses.length,
      unimportedCssFiles: unimported.length,
    },
    perFile,
    colors: sortLocations(colors),
    shadows: sortLocations(shadows),
    svgShadows: sortLocations(svgShadows),
    visualLiterals: sortLocations(visualLiterals),
    repeatedVisualValues,
    duplicateVariables,
    missingVariables,
    aliases,
    potentiallyDeadClasses,
    themeMarkers: sortLocations(themeMarkers),
    cssImports: { ordered: orderedImports, unimported },
    manualReview: [
      "Confirm potentially dead selectors against runtime state, generated class names, exports, and the full cascade before removal.",
      "Classify repeated literals by semantic role before replacing them with a token.",
      "Inspect local-scope custom properties and fallback behavior before consolidating duplicate declarations.",
      "Verify alpha colors, SVG output, canvas export, focus, contrast, reduced motion, and responsive breakpoints in a browser.",
    ],
    limitations: [
      "This is a deterministic lexical audit, not a full CSS parser or a proof of runtime reachability.",
      "Multiline declarations are counted for colors but property-level spacing and shadow analysis is line-oriented.",
      "Potentially dead classes have no exact token in TypeScript, TSX, or index.html; dynamic construction can still make them live.",
      "Runtime custom-property declarations are detected only when the quoted property and style attribute occur on the same source line.",
      "Duplicate custom-property declarations may be intentional when scoped to different selectors or media queries.",
      "A referenced custom property is considered declared when it exists anywhere in the scanned CSS, regardless of cascade scope.",
      "color-mix() is counted as one construct in addition to any literal colors contained inside it.",
    ],
  };
}

function formatAudit(audit: CssTokenAudit): string {
  const lines = [
    "CSS token audit (automatic lexical detection)",
    `CSS files: ${audit.summary.cssFileCount}`,
    `Raw color literals: ${audit.summary.rawColorLiterals} total; ${audit.summary.rawColorLiteralsOutsideTokenSource} outside ${audit.generatedFrom.tokenSource}`,
    `color-mix() constructs: ${audit.summary.colorMixConstructs}`,
    `Shadows: ${audit.summary.shadowDeclarations} CSS declarations; ${audit.summary.svgShadowReferences} SVG/filter references`,
    `Visual literals: spacing ${audit.summary.visualLiterals.spacing}, dimensions ${audit.summary.visualLiterals.dimension}, radii ${audit.summary.visualLiterals.radius}, font-size ${audit.summary.visualLiterals.fontSize}`,
    `Custom properties: ${audit.summary.variableDeclarations} declarations; ${audit.summary.variableReferences} references; ${audit.summary.duplicateVariableNames} duplicated names`,
    `Missing custom-property references: ${audit.summary.missingVariableReferences} total; ${audit.summary.missingVariableReferencesWithoutFallback} without fallback`,
    `Legacy aliases: ${audit.summary.aliasDeclarations} declared; ${audit.summary.aliasesWithoutConsumers} without consumers`,
    `Selector classes: ${audit.summary.selectorClasses}; ${audit.summary.potentiallyDeadClasses} require manual reachability review`,
    `Unimported CSS files: ${audit.summary.unimportedCssFiles}`,
    "",
    "Color literals by file",
  ];

  for (const file of audit.perFile) {
    const colorTotal = Object.values(file.colors).reduce((total, count) => total + count, 0);
    lines.push(
      `${file.file}: ${colorTotal} colors (hex ${file.colors.hex}, rgb ${file.colors.rgb}, hsl ${file.colors.hsl}, color-mix ${file.colors.colorMix})`,
    );
  }

  lines.push("", "Missing variables");
  if (audit.missingVariables.length === 0) lines.push("none");
  for (const item of audit.missingVariables) {
    const withoutFallback = item.references.filter((reference) => !reference.hasFallback).length;
    lines.push(`${item.name}: ${item.references.length} references (${withoutFallback} without fallback)`);
  }

  lines.push("", "Potentially dead classes (first 40; use --json for the complete inventory)");
  for (const item of audit.potentiallyDeadClasses.slice(0, 40)) {
    lines.push(`${item.name}: ${item.cssLocations.length} CSS locations`);
  }

  lines.push("", "Manual verification required");
  for (const item of audit.manualReview) lines.push(`- ${item}`);
  lines.push("", "Limitations");
  for (const item of audit.limitations) lines.push(`- ${item}`);
  return lines.join("\n");
}

export function runCssTokenAudit(args = process.argv.slice(2), root = process.cwd()): CssTokenAudit {
  const allowed = new Set(["--json", "--strict"]);
  const invalid = args.filter((argument) => !allowed.has(argument));
  if (invalid.length > 0) throw new Error(`Unknown argument(s): ${invalid.join(", ")}`);
  if (!existsSync(resolve(root, "src/styles/tokens.css"))) {
    throw new Error("src/styles/tokens.css is missing.");
  }

  const audit = auditCssTokens(root);
  console.log(args.includes("--json") ? JSON.stringify(audit, null, 2) : formatAudit(audit));

  if (
    args.includes("--strict") &&
    (audit.summary.missingVariableReferencesWithoutFallback > 0 || audit.summary.unimportedCssFiles > 0)
  ) {
    process.exitCode = 2;
  }
  return audit;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    runCssTokenAudit();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
