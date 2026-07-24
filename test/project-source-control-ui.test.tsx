import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SourceControlPanel } from "../src/components/versioning/SourceControlPanel.tsx";
import { getPreferredCompareView, getSourceControlChangeCode, sortSourceControlChanges } from "../src/components/versioning/sourceControlPresentation.ts";
import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import { createEmptyProjectVersioningState } from "../src/utils/projectFile.ts";
import { getProjectUncommittedChangeState, type ProjectFileChange } from "../src/features/versioning/useProjectVersioning.ts";
import { createProjectWideSnapshotForTest } from "./support/projectWideSnapshot.ts";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const noop = () => undefined;

function renderPanel() {
  const snapshot = createProjectWideSnapshotForTest();
  const changeState = getProjectUncommittedChangeState(createEmptyProjectVersioningState(), snapshot);
  return withTestLocale("en", () => renderToStaticMarkup(
    <I18nProvider>
      <SourceControlPanel
        projectName="ER Studio" projectFilePaths={{}} workingFileIds={Object.keys(snapshot.files ?? {})}
        commitMessage="Initial snapshot" changeState={changeState} commits={[]} headCommitId={null} selectedCommitId={null}
        onCommitMessageChange={noop} onCommit={noop} onRefresh={noop} onReviewAllChanges={noop}
        onReviewFile={noop} onOpenFile={noop} onSelectCommit={noop} onCompareWithCurrent={noop}
        onCompareWithHead={noop} onCompareWithParent={noop} onRestoreCommit={noop} onDeleteCommit={noop}
      />
    </I18nProvider>,
  ));
}

test("Source Control presents local snapshots without fake Git concepts", () => {
  const markup = renderPanel();
  const source = readFileSync(new URL("../src/components/versioning/SourceControlPanel.tsx", import.meta.url), "utf8");
  assert.match(markup, /Source Control/i);
  assert.match(markup, /No local snapshots|Nessuno snapshot locale/);
  assert.match(markup, /textarea/);
  assert.doesNotMatch(markup, /Repositories/i);
  assert.doesNotMatch(source, /branchName|source-control-branch-pill|>main</);
});

test("Changes are expanded, History is collapsed, and there is one meaningful refresh", () => {
  const markup = renderPanel();
  const source = readFileSync(new URL("../src/components/versioning/SourceControlPanel.tsx", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(markup, /aria-expanded="true"[^>]*>[\s\S]*Changes/i);
  assert.match(markup, /aria-expanded="false"[^>]*>[\s\S]*History/i);
  assert.equal((source.match(/icon="refresh"/g) ?? []).length, 1);
  assert.match(appSource, /syncActiveSchemaToProject/);
  assert.doesNotMatch(source, /pointermove|historyResize|source-control-history-splitter|--source-control-history-height/);
});

test("Source Control persists disclosures and keeps Ctrl+Enter commit", () => {
  const source = readFileSync(new URL("../src/components/versioning/SourceControlPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /SOURCE_CONTROL_CHANGES_EXPANDED_KEY/);
  assert.match(source, /SOURCE_CONTROL_HISTORY_EXPANDED_KEY/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /props\.onCommit\(\)/);
});

test("Source Control always stacks the full-width message above a dedicated submit row", () => {
  const markup = renderPanel();
  const source = readFileSync(new URL("../src/components/versioning/SourceControlPanel.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/source-control-panel.css", import.meta.url), "utf8");
  assert.match(markup, /source-control-commit-submit-row/);
  assert.match(source, /aria-busy=\{props\.commitBusy \|\| undefined\}/);
  assert.match(css, /\.source-control-commit-composer\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.source-control-commit-input\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.source-control-commit-submit-row\s*\{[^}]*justify-content:\s*flex-end/);
  assert.doesNotMatch(css, /\.source-control-commit-composer\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.doesNotMatch(css, /@media \(max-width: 640px\)\s*\{\s*\.source-control-commit-composer/);
});

test("change presentation uses stable status ordering and file-specific compare modes", () => {
  const changes: ProjectFileChange[] = [
    { fileId: "d", name: "deleted.sql", kind: "sql", status: "deleted" },
    { fileId: "a", name: "added.txt", kind: "text", status: "added" },
    { fileId: "m", name: "modified.erschema", kind: "schema", status: "modified" },
    { fileId: "r", name: "renamed.txt", kind: "text", status: "renamed", previousName: "old.txt" },
  ];
  assert.deepEqual(sortSourceControlChanges(changes).map((change) => change.status), ["modified", "added", "renamed", "deleted"]);
  assert.deepEqual(changes.map((change) => getSourceControlChangeCode(change.status)), ["D", "A", "M", "R"]);
  assert.equal(getPreferredCompareView("schema"), "er");
  assert.equal(getPreferredCompareView("sql"), "sql");
  assert.equal(getPreferredCompareView("text"), "text");
});

test("App scopes review per file and routes restore/delete through the global confirm dialog", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /scope:\s*\{\s*kind: "file"/);
  assert.match(source, /preferredView: getPreferredCompareView/);
  assert.match(source, /initialScope=\{versionCompareSession\.scope\}/);
  assert.match(source, /requestConfirmDialog\(\{[\s\S]*confirmRestoreTitle/);
  assert.match(source, /requestConfirmDialog\(\{[\s\S]*confirmDeleteTitle/);
});

test("history detail replaces the list and exposes real metadata", () => {
  const source = readFileSync(new URL("../src/components/versioning/SourceControlPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /selectedCommit \? \(/);
  assert.match(source, /source-control-back-button/);
  assert.match(source, /selectedCommit\.description/);
  assert.match(source, /selectedCommit\.author/);
  assert.match(source, /selectedCommit\.automatic/);
  assert.match(source, /getCommitStats/);
  assert.doesNotMatch(source, /PendingAction|source-control-inline-confirm/);
});

test("legacy Source Control CSS selectors were removed from shared styles", () => {
  const sharedCss = ["project-explorer.css", "panels-workspace.css", "responsive.css"]
    .map((name) => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(sharedCss, /\.source-control/);
  const css = readFileSync(new URL("../src/styles/source-control-panel.css", import.meta.url), "utf8");
  assert.match(css, /max-height:\s*45%/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /min-height:\s*0/);
});
