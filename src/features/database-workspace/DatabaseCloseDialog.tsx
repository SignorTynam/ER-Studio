import { Button, Modal } from "../../components/ui";
import { useI18n } from "../../i18n/useI18n";

interface DatabaseCloseDialogProps {
  open: boolean;
  fileName: string;
  busy: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveCopy: () => void;
}

export function DatabaseCloseDialog(props: DatabaseCloseDialogProps) {
  const { t } = useI18n();
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title={t("databaseWorkspace.closeDialog.title")}
      subtitle={t("databaseWorkspace.closeDialog.message", { name: props.fileName })}
      size="sm"
      busy={props.busy}
      footer={(
        <>
          <Button variant="secondary" disabled={props.busy} onClick={props.onCancel}>{t("common.actions.cancel")}</Button>
          <Button variant="danger" disabled={props.busy} onClick={props.onDiscard}>{t("databaseWorkspace.closeDialog.discard")}</Button>
          <Button variant="primary" loading={props.busy} onClick={props.onSaveCopy}>{t("databaseWorkspace.saveCopy")}</Button>
        </>
      )}
    >
      <p>{t("databaseWorkspace.closeDialog.originalSafe")}</p>
    </Modal>
  );
}
