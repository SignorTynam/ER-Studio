import { useI18n } from "../../i18n/useI18n";
import { StudioIcon } from "../icons/StudioIcon";
import { Button, Modal } from "../ui";

interface ProjectTextFileModalProps {
  open: boolean;
  fileName: string;
  content: string;
  editable?: boolean;
  dirty?: boolean;
  onChange: (content: string) => void;
  onClose: () => void;
}

export function ProjectTextFileModal({
  open,
  fileName,
  content,
  editable = true,
  onChange,
  onClose,
}: ProjectTextFileModalProps) {
  const { t } = useI18n();

  if (!open) {
    return null;
  }

  return (
    <Modal
      open
      onClose={onClose}
      hideClose
      backdropClassName="project-text-file-modal-backdrop"
      className="project-text-file-modal"
      ariaLabelledBy="project-text-file-modal-title"
    >
        <header className="ui-modal__head project-text-file-modal__header">
          <h2 id="project-text-file-modal-title">{t("textFileModal.title", { name: fileName })}</h2>
          <button type="button" className="ui-modal__close" onClick={onClose} aria-label={t("textFileModal.close")}>
            <StudioIcon name="close" aria-hidden="true" />
          </button>
        </header>
        <textarea
          className="project-text-file-modal__editor"
          value={content}
          onChange={(event) => onChange(event.target.value)}
          readOnly={!editable}
          placeholder={t("textFileModal.placeholder")}
          aria-label={t("textFileModal.title", { name: fileName })}
        />
        {content.trim().length === 0 ? <p className="project-text-file-modal__empty">{t("textFileModal.empty")}</p> : null}
        <footer className="project-text-file-modal__footer">
          <Button variant="secondary" onClick={onClose}>
            {t("textFileModal.close")}
          </Button>
        </footer>
    </Modal>
  );
}
