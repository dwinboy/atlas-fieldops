"use client";

import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";

/**
 * On-brand replacement for window.confirm(): a small Modal with a message and
 * confirm/cancel actions. Drive it with a nullable request object — set it to open,
 * null it to close; onConfirm runs the deferred continuation.
 *
 *   const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
 *   // guard site: setConfirmRequest({ message, onConfirm: () => continueFlow() });
 *   <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
 */
export type ConfirmRequest = {
  confirmLabel?: string;
  message: string;
  onConfirm: () => void;
  title?: string;
  tone?: "danger" | "primary";
};

export function ConfirmDialog({
  onClose,
  request,
}: {
  onClose: () => void;
  request: ConfirmRequest | null;
}) {
  return (
    <Modal
      contentClassName="max-w-md"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={Boolean(request)}
      title={request?.title ?? "Are you sure?"}
    >
      <ModalBody>
        <p className="text-sm leading-6 text-muted-foreground">{request?.message}</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          onClick={() => {
            request?.onConfirm();
            onClose();
          }}
          type="button"
          variant={request?.tone === "danger" ? "danger" : "primary"}
        >
          {request?.confirmLabel ?? "Confirm"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
