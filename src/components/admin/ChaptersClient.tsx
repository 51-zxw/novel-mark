"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VolumeWithChapters } from "@/types/database";
import { ImportPanel } from "./ImportPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Props = {
  bookId: string;
  bookTitle: string;
  volumes: VolumeWithChapters[];
  onDeleteAction: (chapterId: string) => Promise<void>;
};

export function ChaptersClient({ bookId, bookTitle, volumes, onDeleteAction }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [targetVolumeId, setTargetVolumeId] = useState<string | null>(null);
  const router = useRouter();

  function openImport(volumeId?: string) {
    setTargetVolumeId(volumeId ?? null);
    setShowImport(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--fg-muted)]">
          共 {volumes.length} 卷 /{" "}
          {volumes.reduce((s, v) => s + v.chapters.length, 0)} 章
        </div>
        <button
          type="button"
          onClick={() => openImport()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black inline-flex items-center gap-2 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98]"
        >
          <span>📥</span>
          <span>批量导入</span>
        </button>
      </div>

      {/* 章节树 */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        {volumes.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--fg-muted)]">
            暂无章节，点击右上角「批量导入」从 TXT 文件导入
          </div>
        ) : (
          volumes.map((vol, vi) => (
            <VolumeRow
              key={vol.id || vi}
              volume={vol}
              volumeIndex={vi}
              bookId={bookId}
              onDeleteAction={onDeleteAction}
              onImportToVolume={() => openImport(vol.id)}
            />
          ))
        )}
      </div>

      {showImport && (
        <ImportPanel
          bookId={bookId}
          bookTitle={bookTitle}
          targetVolumeId={targetVolumeId}
          onClose={() => setShowImport(false)}
          onImported={() => router.refresh()}
        />
      )}
    </div>
  );
}

function VolumeRow({
  volume,
  volumeIndex,
  bookId,
  onDeleteAction,
  onImportToVolume,
}: {
  volume: VolumeWithChapters;
  volumeIndex: number;
  bookId: string;
  onDeleteAction: (chapterId: string) => Promise<void>;
  onImportToVolume: () => void;
}) {
  // 只有第一卷默认展开
  const [open, setOpen] = useState(volumeIndex === 0);
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-center bg-[var(--bg-soft)] px-4 py-3 transition-colors hover:bg-[var(--bg-card)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 min-w-0 items-center gap-2 text-left"
        >
          <svg
            className={`h-4 w-4 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M7 5l6 5-6 5V5z" />
          </svg>
          <span className="font-medium text-sm">第{volumeIndex + 1}卷 {volume.title}</span>
          <span className="text-xs text-[var(--fg-muted)]">({volume.chapters.length} 章)</span>
        </button>
        <button
          type="button"
          onClick={onImportToVolume}
          className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--fg-muted)] transition-all duration-150 hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-95 inline-flex items-center gap-1"
        >
          <span>📥</span>
          <span>导入</span>
        </button>
      </div>
      {open && (
        <div>
          {volume.chapters.map((ch, ci) => (
            <ChapterRow
              key={ch.id}
              chapter={ch}
              chapterIndex={ci}
              bookId={bookId}
              onDeleteAction={onDeleteAction}
            />
          ))}
          {volume.chapters.length === 0 && (
            <div className="px-4 py-3 text-xs text-[var(--fg-muted)]">本卷暂无章节</div>
          )}
        </div>
      )}
    </div>
  );
}

function ChapterRow({
  chapter,
  chapterIndex,
  bookId,
  onDeleteAction,
}: {
  chapter: { id: string; title: string; order: number; word_count: number; proofread?: boolean };
  chapterIndex: number;
  bookId: string;
  onDeleteAction: (chapterId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      await onDeleteAction(chapter.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-soft)]/60">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-[var(--fg-muted)] tabular-nums w-12">
          第{chapterIndex + 1}节
        </span>
        <Link
          href={`/admin/books/${bookId}/chapters/${chapter.id}`}
          className="truncate hover:text-[var(--accent)] transition-colors"
        >
          {chapter.title}
        </Link>
        {chapter.proofread && (
          <span className="inline-flex items-center rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-500 shrink-0">
            ✓ 已精校
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[var(--fg-muted)] tabular-nums">
          {chapter.word_count.toLocaleString()}
        </span>
        <Link
          href={`/admin/books/${bookId}/chapters/${chapter.id}`}
          className="inline-flex items-center rounded-md px-2 py-1 text-[var(--accent)] transition-all duration-150 hover:bg-[var(--accent)]/10 active:scale-95"
        >
          编辑
        </Link>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className="text-red-500 hover:text-red-400 disabled:opacity-60 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-150 hover:bg-red-500/10 active:scale-95"
        >
          {isPending && <LoadingSpinner size={12} className="text-red-500" />}
          <span>{isPending ? "删除中" : "删除"}</span>
        </button>
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="删除章节"
        message={`确定删除「${chapter.title}」吗？`}
        confirmText="删除"
        danger
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
