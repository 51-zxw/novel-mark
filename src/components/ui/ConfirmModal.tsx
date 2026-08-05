"use client";

import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-xl">
        <div className="px-5 pt-4 pb-2">
          <div className="text-sm font-medium">{title}</div>
        </div>
        <div className="px-5 pb-4">
          <p className="text-sm text-[var(--fg-muted)]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--fg-muted)] transition-all duration-150 hover:bg-[var(--bg-card)] hover:text-[var(--fg)] active:scale-[0.98] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-1.5 text-sm font-medium text-white inline-flex items-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-60 ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[var(--accent)] text-black hover:brightness-110"
            }`}
          >
            {loading && <LoadingSpinner size={12} className={danger ? "text-white" : "text-black/70"} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
