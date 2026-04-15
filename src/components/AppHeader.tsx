import { useEffect, useRef, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import type { EditorMode } from "../types/diagram";
import { SUPPORTED_LOCALES } from "../i18n";
import { useI18n } from "../i18n/useI18n";

type DiagramWorkspaceView = "er" | "logical";

interface AppHeaderProps {
  appTitle: string;
  appVersion: string;
  diagramName: string;
  diagramView: DiagramWorkspaceView;
  codePanelOpen: boolean;
  notesPanelOpen: boolean;
  mode: EditorMode;
  canUndo: boolean;
  canRedo: boolean;
  logicalOutOfDate: boolean;
  focusMode: boolean;
  toolRailCollapsed: boolean;
  onDiagramViewChange: (view: DiagramWorkspaceView) => void;
  onModeChange: (mode: EditorMode) => void;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onGenerateLogicalModel: () => void;
  onAutoLayoutLogical: () => void;
  onFitLogical: () => void;
  onToggleCodePanel: () => void;
  onToggleNotesPanel: () => void;
  onSaveProject: () => void;
  onSaveErs: () => void;
  onLoadProject: () => void;
  onLoadErs: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onResetErs: () => void;
  onOpenErsGuide: () => void;
  onAbout: () => void;
  onWhatsNew: () => void;
  onToggleFocusMode: () => void;
  onToggleToolRail: () => void;
}

export function AppHeader(props: AppHeaderProps) {
  const { locale, setLocale, t, getLanguageLabel } = useI18n();
  const navRef = useRef<HTMLElement | null>(null);
  const menuGroupRef = useRef<HTMLDetailsElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  function updateMenuPosition() {
    const menuGroup = menuGroupRef.current;
    if (!menuGroup?.open) {
      setMenuStyle(null);
      return;
    }

    const summary = menuGroup.querySelector("summary");
    if (!summary) {
      return;
    }

    const viewportPadding = 12;
    const triggerRect = summary.getBoundingClientRect();
    const width = Math.min(360, Math.max(280, window.innerWidth - viewportPadding * 2));
    const left = Math.max(
      viewportPadding,
      Math.min(triggerRect.right - width, window.innerWidth - width - viewportPadding),
    );
    const top = triggerRect.bottom + 8;
    const maxHeight = Math.max(220, window.innerHeight - top - viewportPadding);

    setMenuStyle({ top, left, width, maxHeight });
  }

  function closeAllMenus() {
    if (!navRef.current) {
      return;
    }

    navRef.current.querySelectorAll("details[open]").forEach((group) => group.removeAttribute("open"));
    setMenuStyle(null);
  }

  useEffect(() => {
    function handleGlobalPointerDown(event: globalThis.MouseEvent) {
      if (!navRef.current) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !navRef.current.contains(target)) {
        closeAllMenus();
      }
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    }

    document.addEventListener("mousedown", handleGlobalPointerDown);
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleGlobalPointerDown);
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    function handleViewportChange() {
      updateMenuPosition();
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, []);

  function handleGroupToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const currentGroup = event.currentTarget;
    if (!currentGroup.open || !navRef.current) {
      if (currentGroup === menuGroupRef.current) {
        setMenuStyle(null);
      }
      return;
    }

    navRef.current.querySelectorAll("details").forEach((group) => {
      if (group !== currentGroup) {
        group.removeAttribute("open");
      }
    });

    if (currentGroup === menuGroupRef.current) {
      window.requestAnimationFrame(() => {
        updateMenuPosition();
      });
    }
  }

  function runMenuAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    action();
    const group = event.currentTarget.closest("details");
    if (group) {
      group.removeAttribute("open");
    }
  }

  return (
    <header className={props.focusMode ? "app-header focus-mode" : "app-header"}>
      <div className="app-title-block">
        <div className="app-title-inline">
          <h1>{props.appTitle}</h1>
          <div className="app-version-pill">v{props.appVersion}</div>
        </div>
        <div className="app-subtitle">{props.diagramName}</div>
      </div>

      <div className="header-switches">
        <div className="header-control-group">
          <div className="mode-switch mode-switch-primary" role="group" aria-label={t("header.viewGroupLabel")}>
            <button
              className={props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onDiagramViewChange("er")}
            >
              ER
            </button>
            <button
              className={props.diagramView === "logical" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onDiagramViewChange("logical")}
            >
              {t("header.views.logical")}
            </button>
          </div>
        </div>

        <div className="header-control-group">
          <div className="mode-switch mode-switch-secondary" role="group" aria-label={t("header.editorModeGroupLabel")}>
            <button
              className={props.mode === "edit" && props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("edit")}
              disabled={props.diagramView !== "er"}
            >
              {t("header.modes.edit")}
            </button>
            <button
              className={props.mode === "view" && props.diagramView === "er" ? "mode-button active" : "mode-button"}
              type="button"
              onClick={() => props.onModeChange("view")}
              disabled={props.diagramView !== "er"}
            >
              {t("header.modes.view")}
            </button>
          </div>
        </div>
      </div>

      <div className="header-utility-bar">
        <div className="header-control-group header-control-group-actions">
          <div className="header-quick-actions" role="group" aria-label={t("header.quickActionsLabel")}>
            <button
              type="button"
              className="header-button header-quick-button"
              onClick={props.onUndo}
              disabled={!props.canUndo}
              title={t("common.actions.undo")}
            >
              {t("common.actions.undo")}
            </button>
            <button
              type="button"
              className="header-button header-quick-button"
              onClick={props.onRedo}
              disabled={!props.canRedo}
              title={t("common.actions.redo")}
            >
              {t("common.actions.redo")}
            </button>
            {props.diagramView === "er" ? (
              <>
                <button
                  type="button"
                  className={
                    props.codePanelOpen
                      ? "header-button header-quick-button active"
                      : "header-button header-quick-button"
                  }
                  onClick={props.onToggleCodePanel}
                  title={props.codePanelOpen ? t("header.quickActions.hideCode") : t("header.quickActions.showCode")}
                >
                  {props.codePanelOpen ? t("common.actions.hide") : t("common.actions.show")} code
                </button>
                <button
                  type="button"
                  className={
                    props.notesPanelOpen
                      ? "header-button header-quick-button active"
                      : "header-button header-quick-button"
                  }
                  onClick={props.onToggleNotesPanel}
                  title={props.notesPanelOpen ? t("header.quickActions.hideNotes") : t("header.quickActions.showNotes")}
                >
                  {props.notesPanelOpen ? t("common.actions.hide") : t("common.actions.show")} notes
                </button>
              </>
            ) : null}
            {props.diagramView === "logical" ? (
              <>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onGenerateLogicalModel}
                  title={
                    props.logicalOutOfDate
                      ? t("header.quickActions.resetLogicalOutdatedTitle")
                      : t("header.quickActions.resetLogicalTitle")
                  }
                >
                  {props.logicalOutOfDate ? t("header.quickActions.resetLogicalOutdated") : t("header.quickActions.resetLogical")}
                </button>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onAutoLayoutLogical}
                  title={t("header.quickActions.autoLayoutTitle")}
                >
                  {t("header.quickActions.autoLayout")}
                </button>
                <button
                  type="button"
                  className="header-button header-quick-button"
                  onClick={props.onFitLogical}
                  title={t("header.quickActions.fitLogicalTitle")}
                >
                  {t("header.quickActions.fitLogical")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={
                props.focusMode
                  ? "header-button header-quick-button active"
                  : "header-button header-quick-button"
              }
              onClick={props.onToggleFocusMode}
              title={props.focusMode ? t("header.quickActions.exitFocusTitle") : t("header.quickActions.focusTitle")}
            >
              {props.focusMode ? t("header.quickActions.exitFocus") : t("header.quickActions.focus")}
            </button>
          </div>
        </div>

        <div className="header-control-group header-control-group-menu">
          <nav ref={navRef} className="header-nav" aria-label={t("header.secondaryActionsLabel")}>
            <details ref={menuGroupRef} className="nav-group nav-group-menu" onToggle={handleGroupToggle}>
              <summary>{t("header.menu.trigger")}</summary>
              <div
                className="nav-menu nav-menu-wide nav-menu-floating"
                style={
                  menuStyle
                    ? {
                        top: `${menuStyle.top}px`,
                        left: `${menuStyle.left}px`,
                        width: `${menuStyle.width}px`,
                        maxHeight: `${menuStyle.maxHeight}px`,
                      }
                    : { visibility: "hidden" }
                }
              >
                <div className="nav-menu-section">
                  <div className="nav-menu-label">{t("header.menu.sections.workspace")}</div>
                  <button
                    type="button"
                    onClick={(event) => runMenuAction(event, props.onToggleToolRail)}
                    disabled={props.focusMode}
                  >
                    {props.toolRailCollapsed
                      ? t("header.menu.actions.openTools")
                      : t("header.menu.actions.collapseTools")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onResetErs)}>
                    {t("header.menu.actions.regenerateErs")}
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">{t("header.menu.sections.file")}</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onNewProject)}>
                    {t("header.menu.actions.newProject")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onLoadProject)}>
                    {t("header.menu.actions.loadProject")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onLoadErs)}>
                    {t("header.menu.actions.loadErs")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onSaveProject)}>
                    {t("header.menu.actions.saveProject")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onSaveErs)}>
                    {t("header.menu.actions.saveErs")}
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">{t("header.menu.sections.export")}</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onExportPng)}>
                    PNG
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onExportSvg)}>
                    SVG
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">{t("header.menu.sections.help")}</div>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onOpenErsGuide)}>
                    {t("header.menu.actions.ersGuide")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onAbout)}>
                    {t("header.menu.actions.about")}
                  </button>
                  <button type="button" onClick={(event) => runMenuAction(event, props.onWhatsNew)}>
                    {t("header.menu.actions.whatsNew")}
                  </button>
                </div>

                <div className="nav-menu-section">
                  <div className="nav-menu-label">
                    {t("header.menu.sections.language")} · {getLanguageLabel(locale)}
                  </div>
                  {SUPPORTED_LOCALES.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={(event) =>
                        runMenuAction(event, () => {
                          setLocale(language);
                        })
                      }
                      aria-pressed={locale === language}
                    >
                      {getLanguageLabel(language)}
                      {locale === language ? " •" : ""}
                    </button>
                  ))}
                </div>
                <div className="nav-menu-section">
                  <div className="nav-menu-label">{t("language.label")}</div>
                  <button type="button" disabled>
                    {t("language.current", { label: getLanguageLabel(locale) })}
                  </button>
                </div>
              </div>
            </details>
          </nav>
        </div>
      </div>
    </header>
  );
}
