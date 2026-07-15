import { useEffect, useState } from "react";
import type { ProjectUncommittedChangeCategories } from "../../features/versioning/useProjectVersioning";
import { useI18n } from "../../i18n/useI18n";
import { Button, Field, Modal } from "../ui";

interface CommitDialogProps {
  open: boolean;
  busy: boolean;
  error: string;
  canCommit: boolean;
  hint: string;
  categories: ProjectUncommittedChangeCategories;
  firstCommit: boolean;
  onClose: () => void;
  onSubmit: (message: string, description?: string) => void;
}

const CATEGORY_KEYS = ["er", "layout", "logical", "code", "workspace"] as const;

function getChangedCategoryKeys(categories: ProjectUncommittedChangeCategories) {
  return CATEGORY_KEYS.filter((key) => categories[key]);
}

export function CommitDialog({
  open,
  busy,
  error,
  canCommit,
  hint,
  categories,
  firstCommit,
  onClose,
  onSubmit,
}: CommitDialogProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const changedCategories = getChangedCategoryKeys(categories);
  const suggestedMessage =
    firstCommit
      ? t("versioning.suggestions.initialSchema")
      : changedCategories.length === 1
        ? t(`versioning.suggestions.${changedCategories[0]}`)
        : t("versioning.suggestions.project");

  useEffect(() => {
    if (open) {
      setMessage(canCommit ? suggestedMessage : "");
      setDescription("");
    }
  }, [canCommit, open, suggestedMessage]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={firstCommit ? t("versioning.createFirstCommit") : t("versioning.newCommit")}
      subtitle={t("versioning.commitDialogDescription")}
      className="action-modal versioning-commit-dialog"
      testId="commit-dialog"
    >
      <form
        className="action-modal-content versioning-commit-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(message, description);
        }}
      >
        {changedCategories.length > 0 ? (
          <div className="versioning-dialog-section" data-testid="commit-dialog-categories">
            <span>{t("versioning.changedCategories")}</span>
            <div className="versioning-category-list">
              {changedCategories.map((key) => (
                <span key={key} className="versioning-category-pill">
                  {t(`versioning.categories.${key}`)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="versioning-dialog-section" data-testid="commit-message-suggestion">
          <span>{t("versioning.messageSuggestion")}</span>
          <button
            type="button"
            className="versioning-suggestion-button"
            onClick={() => setMessage(suggestedMessage)}
            disabled={busy || !canCommit}
          >
            {suggestedMessage}
          </button>
        </div>
        <Field label={t("versioning.commitMessage")}>
          {({ id }) => (
            <input
              id={id}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={busy}
              autoFocus
              data-testid="commit-message-input"
            />
          )}
        </Field>
        <Field label={t("versioning.optionalDescription")}>
          {({ id }) => (
            <textarea
              id={id}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
              rows={4}
              data-testid="commit-description-input"
            />
          )}
        </Field>
        <div className="versioning-message-examples" aria-label={t("versioning.messageExamples")}>
          <span>{t("versioning.examples.initialSchema")}</span>
          <span>{t("versioning.examples.addedEntities")}</span>
          <span>{t("versioning.examples.refinedLayout")}</span>
          <span>{t("versioning.examples.updatedLogical")}</span>
        </div>
        {hint ? <p className={canCommit ? "action-modal-hint" : "action-modal-error"}>{hint}</p> : null}
        {error ? <p className="action-modal-error">{error}</p> : null}
        <div className="ui-modal__footer action-modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !canCommit}
            data-testid="create-commit-button"
          >
            {t("versioning.createCommit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
