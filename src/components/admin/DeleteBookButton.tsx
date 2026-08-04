"use client";

import { useTransition } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  bookId: string;
  bookTitle: string;
  action: (id: string) => Promise<void>;
};

export function DeleteBookButton({ bookId, bookTitle, action }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`确定删除《${bookTitle}》吗？此操作会级联删除所有章节，不可恢复。`)) {
      return;
    }
    startTransition(async () => {
      await action(bookId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-red-500 hover:text-red-400 disabled:opacity-60 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-500/10 transition-all duration-150 active:scale-95"
    >
      {isPending && <LoadingSpinner size={12} className="text-red-500" />}
      <span>{isPending ? "删除中..." : "删除"}</span>
    </button>
  );
}
