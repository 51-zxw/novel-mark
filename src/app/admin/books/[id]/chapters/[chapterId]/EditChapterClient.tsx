"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChapterEditor, SubmitBar } from "@/components/admin/ChapterEditor";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type SaveAction = (
  chId: string,
  bId: string,
  title: string,
  content: string,
  proofread: boolean
) => Promise<void>;

export function EditChapterClient({
  bookId,
  chapterId,
  chapterIndex,
  initialTitle,
  initialContent,
  initialProofread,
  saveAction,
  backHref,
}: {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  initialTitle: string;
  initialContent: string;
  initialProofread: boolean;
  saveAction: SaveAction;
  backHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [proofread, setProofread] = useState(initialProofread);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await saveAction(chapterId, bookId, title, content, proofread);
      router.push(backHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 relative">
      {/* 保存中：全屏 loading 蒙层 */}
      {loading && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm">
          <LoadingSpinner size={44} />
          <p className="mt-4 text-sm text-[var(--fg-muted)]">保存中...</p>
        </div>
      )}

      {/* 顶部操作栏：返回链接 + 保存/取消同一行 */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1"
        >
          ← 返回章节列表
        </Link>
        <SubmitBar
          loading={loading}
          proofread={proofread}
          onProofreadChange={setProofread}
          onCancel={() => router.back()}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      <ChapterEditor
        chapterIndex={chapterIndex}
        title={title}
        content={content}
        proofread={proofread}
        onTitleChange={setTitle}
        onContentChange={setContent}
      />
    </form>
  );
}
