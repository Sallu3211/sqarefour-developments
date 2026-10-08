"use client";

import { Button } from "./Primitives";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1.5 whitespace-pre-line text-sm text-slate-500">{description}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
