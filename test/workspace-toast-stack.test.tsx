import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "../src/i18n/I18nProvider.tsx";
import type { WorkspaceNotice } from "../src/hooks/useWorkspaceNotices.ts";
import {
  MAX_VISIBLE_WORKSPACE_TOASTS,
  WorkspaceToastStack,
  getDefaultNoticeTitleKey,
  getNoticeRelativeTime,
  getVisibleWorkspaceToasts,
} from "../src/components/WorkspaceToastStack.tsx";
import { withTestLocale } from "./utils/i18nTestUtils.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function notice(overrides: Partial<WorkspaceNotice> = {}): WorkspaceNotice {
  return {
    id: 1,
    title: "Operazione non valida",
    message: "Non puoi collegare questi elementi direttamente.",
    tone: "warning",
    createdAt: 1_000,
    ...overrides,
  };
}

function renderToastStack(notices: WorkspaceNotice[]): string {
  return withTestLocale("en", () => renderToStaticMarkup(
    <I18nProvider>
      <WorkspaceToastStack notices={notices} onDismissNotice={() => undefined} />
    </I18nProvider>,
  ));
}

test("workspace toast viewport remains mounted as a portal target when empty", () => {
  const markup = renderToastStack([]);

  assert.match(markup, /workspace-toast-viewport/);
  assert.match(markup, /workspace-toast-stack/);
  assert.doesNotMatch(markup, /workspace-toast tone-/);
});

test("workspace toast stack renders all visible notices, not only the first", () => {
  const markup = renderToastStack([
    notice({ id: 1, message: "Primo messaggio", createdAt: 1_000 }),
    notice({ id: 2, tone: "error", title: "Errore", message: "Secondo messaggio", createdAt: 2_000 }),
  ]);

  assert.match(markup, /Primo messaggio/);
  assert.match(markup, /Secondo messaggio/);
});

test("workspace toast stack renders title, message, close button and tone class", () => {
  const markup = renderToastStack([
    notice({ id: 3, tone: "error", title: "Errore nel codice ERS", message: "Sintassi ERS non valida." }),
  ]);

  assert.match(markup, /Errore nel codice ERS/);
  assert.match(markup, /Sintassi ERS non valida\./);
  assert.match(markup, /workspace-toast tone-error/);
  assert.match(markup, /aria-label="(?:Dismiss notification|Chiudi notifica|Mbyll njoftimin)"/);
  assert.match(markup, /role="alert"/);
});

test("workspace toast stack limits visible notices to the newest four", () => {
  const notices = Array.from({ length: 6 }, (_, index) =>
    notice({ id: index + 1, message: `Messaggio ${index + 1}`, createdAt: index + 1 }),
  );
  const visible = getVisibleWorkspaceToasts(notices);
  const markup = renderToastStack(notices);

  assert.equal(visible.length, MAX_VISIBLE_WORKSPACE_TOASTS);
  assert.deepEqual(visible.map((item) => item.id), [6, 5, 4, 3]);
  assert.match(markup, /Messaggio 6/);
  assert.doesNotMatch(markup, /Messaggio 1/);
});

test("workspace toast helpers provide default titles and relative time", () => {
  assert.equal(getDefaultNoticeTitleKey("warning"), "workspaceToasts.defaultTitles.warning");
  assert.equal(getDefaultNoticeTitleKey("info"), "workspaceToasts.defaultTitles.info");
  assert.deepEqual(getNoticeRelativeTime(1_000, 4_000), { key: "workspaceToasts.relativeTime.now" });
  assert.deepEqual(getNoticeRelativeTime(1_000, 12_000), {
    key: "workspaceToasts.relativeTime.secondsAgo",
    count: 11,
  });
  assert.deepEqual(getNoticeRelativeTime(1_000, 121_000), {
    key: "workspaceToasts.relativeTime.minutesAgo",
    count: 2,
  });
});

test("workspace toast stack renders localized default title and relative time", () => {
  const markup = renderToastStack([notice({ id: 9, title: undefined, createdAt: Date.now() })]);

  assert.match(markup, /Invalid operation|Operazione non valida|Veprim i pavlefshëm/);
  assert.match(markup, /workspace-toast-time/);
});
