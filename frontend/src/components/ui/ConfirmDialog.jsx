// frontend/src/components/ui/ConfirmDialog.jsx
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmar",
  loading,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
