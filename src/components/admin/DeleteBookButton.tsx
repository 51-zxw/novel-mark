"use client";

import { useState, useTransition } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Props = {
  bookId: string;
  bookTitle: string;
  action: (id: string) => Promise<void>;
};

export function DeleteBookButton({ bookId, bookTitle, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      await action(bookId);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="text-red-500 hover:text-red-400 disabled:opacity-60 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-500/10 transition-all duration-150 active:scale-95"
      >
        {isPending && <LoadingSpinner size={12} className="text-red-500" />}
        <span>{isPending ? "删除中..." : "删除"}</span>
      </button>
      <ConfirmModal
        open={confirmOpen}
        title="删除书籍"
        message={`确定删除《${bookTitle}》吗？此操作会级联删除所有章节，不可恢复。`}
        confirmText="删除"
        danger
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
