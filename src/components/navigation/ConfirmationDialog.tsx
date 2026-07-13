"use client";

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";

type ConfirmationDialogProps = {
  dialogId: string;
  title: string;
  description: string;
  confirmLabel: string;
  triggerLabel: string;
  onConfirm: () => void;
  tone?: "default" | "danger";
  onOpen?: () => void;
};

export function ConfirmationDialog({
  dialogId,
  title,
  description,
  confirmLabel,
  triggerLabel,
  onConfirm,
  tone = "default",
  onOpen,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.setAttribute("closedby", "any");
  }, []);

  function openDialog() {
    onOpen?.();
    dialogRef.current?.showModal();
  }

  function handleClose() {
    if (dialogRef.current?.returnValue === "confirm") {
      onConfirm();
    }
  }

  function handleBackdropClick(event: ReactMouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;

    if (dialog === null || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    if (event.target !== dialog) {
      return;
    }

    const bounds = dialog.getBoundingClientRect();
    const isInsideDialog =
      bounds.top <= event.clientY &&
      event.clientY <= bounds.bottom &&
      bounds.left <= event.clientX &&
      event.clientX <= bounds.right;

    if (!isInsideDialog) {
      dialog.close("cancel");
    }
  }

  return (
    <>
      <button className="menu-action" type="button" onClick={openDialog}>
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="confirmation-dialog"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onClose={handleClose}
        onClick={handleBackdropClick}
      >
        <form method="dialog" className="confirmation-dialog__body">
          <p className="eyebrow">CONFIRM</p>
          <h2 id={`${dialogId}-title`}>{title}</h2>
          <p id={`${dialogId}-description`}>{description}</p>
          <div className="confirmation-dialog__actions">
            <button className="button button--quiet" value="cancel">
              キャンセル
            </button>
            <button
              className={tone === "danger" ? "button button--danger" : "button button--primary"}
              value="confirm"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
