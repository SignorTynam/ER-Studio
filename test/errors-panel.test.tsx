import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ErrorsPanel } from "../src/components/validation/ErrorsPanel.tsx";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { getValidationActivityPresentation, sortValidationIssuePresentations, type ValidationIssuePresentation } from "../src/utils/validationIssuePresentation.ts";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const renderInEnglish = (element: React.ReactElement): string =>
  withTestLocale("en", () => renderToStaticMarkup(element));
const issues: ValidationIssuePresentation[] = [
  { id: "warning-b", level: "warning", targetId: "b", targetType: "node", title: "Beta", targetKind: "Entity", message: "Warning", actions: [] },
  { id: "error-z", level: "error", targetId: "z", targetType: "node", title: "Zeta", targetKind: "Attribute", message: "Error Z", actions: [{ id: "error-z::delete-attribute", type: "delete-attribute", kind: "auto", label: "Delete attribute", icon: "delete" }] },
  { id: "error-a", level: "error", targetId: "a", targetType: "edge", title: "Alpha", targetKind: "Connection", message: "Error A", actions: [{ id: "error-a::delete-edge", type: "delete-edge", kind: "auto", label: "Delete link", icon: "delete" }] },
];

test("ErrorsPanel uses shared primitives, filters, counts, and flat problem rows", () => {
  const markup = renderInEnglish(<I18nProvider><ErrorsPanel issues={issues} showIndicators onToggleIndicators={() => undefined} onSelectIssue={() => undefined} onIssueAction={() => undefined} /></I18nProvider>);
  assert.match(markup, /role="tablist"/);
  assert.match(markup, /All|Tutti/);
  assert.match(markup, /role="listbox"/);
  assert.equal((markup.match(/role="option"/g) ?? []).length, 3);
  assert.match(markup, /aria-pressed="true"/);
});

test("ErrorsPanel renders one quick-fix control per issue that has an action", () => {
  const markup = renderInEnglish(<I18nProvider><ErrorsPanel issues={issues} showIndicators onToggleIndicators={() => undefined} onSelectIssue={() => undefined} onIssueAction={() => undefined} /></I18nProvider>);
  assert.equal((markup.match(/errors-panel__row-action"/g) ?? []).length, 2);
  assert.match(markup, /aria-label="Delete link"/);
  assert.match(markup, /aria-label="Delete attribute"/);
});

test("ErrorsPanel hides the numeric badge at zero and shows a compact empty state", () => {
  const markup = renderInEnglish(<I18nProvider><ErrorsPanel issues={[]} showIndicators={false} onToggleIndicators={() => undefined} onSelectIssue={() => undefined} onIssueAction={() => undefined} /></I18nProvider>);
  assert.doesNotMatch(markup, /workspace-panel__badge/);
  assert.match(markup, /workspace-panel__empty/);
  assert.match(markup, /workspace-panel__empty--success/);
  assert.match(markup, /Valid diagram/);
  assert.match(markup, /No errors or warnings were found/);
});

test("validation issue sorting is stable by severity, title, and id", () => {
  assert.deepEqual(sortValidationIssuePresentations(issues).map((issue) => issue.id), ["error-a", "error-z", "warning-b"]);
});

test("activity rail is neutral without issues and severity-aware otherwise", () => {
  assert.deepEqual(getValidationActivityPresentation([]), { icon: "errors" });
  assert.deepEqual(getValidationActivityPresentation([{ id: "w", level: "warning", message: "", targetId: "n", targetType: "node" }]), { icon: "warning", badge: 1 });
  assert.deepEqual(getValidationActivityPresentation([{ id: "e", level: "error", message: "", targetId: "n", targetType: "node" }]), { icon: "error", badge: 1 });
});

test("ErrorsPanel supports keyboard navigation and has dedicated responsive CSS", () => {
  const source = readFileSync(new URL("../src/components/validation/ErrorsPanel.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/errors-panel.css", import.meta.url), "utf8");
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /min-height:\s*0/);
  assert.match(css, /@media \(max-width: 640px\)/);
});

test("App mounts the extracted ErrorsPanel and removes the legacy errors modal", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /<ErrorsPanel/);
  assert.match(source, /getValidationActivityPresentation/);
  assert.doesNotMatch(source, /errors-modal|project-activity-issue-list/);
});

test("ErrorsPanel keeps neutral empty-filter copy separate from the positive all state", () => {
  const source = readFileSync(new URL("../src/components/validation/ErrorsPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /filter === "all" \? "success" : "neutral"/);
  assert.match(source, /errors\.panel\.emptyFilterTitle/);
  assert.match(source, /errors\.panel\.emptyFilterDescription/);
  assert.match(source, /onIssueAction\(issue, action\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
});
