"use client";

import { useState, useEffect } from "react";
import { ChapterItem, type ChapterLite } from "./ChapterItem";

export function VolumeSection({
  bookId,
  volumeId,
  volumeTitle,
  volumeNumber,
  chapterCount,
  defaultOpen = false,
}: {
  bookId: string;
  volumeId: string;
  volumeTitle: string;
  volumeNumber: number;
  chapterCount: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [chapters, setChapters] = useState<ChapterLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 初始默认展开时也需要加载
  useEffect(() => {
    if (open && !loaded) {
      loadChapters();
    }
  }, [open]);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/volumes/${volumeId}/chapters`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data.chapters);
        setLoaded(true);
      }
    } catch (err) {
      console.error("加载章节失败:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-2 text-left hover:bg-[var(--bg-soft)] -mx-4 px-4 rounded transition-colors"
      >
        <span className="font-serif text-base font-medium flex-shrink-0">第{volumeNumber}卷 · {volumeTitle}</span>
        <div className="flex-1 border-b border-dashed border-[var(--border)] translate-y-[-2px]"></div>
        <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] flex-shrink-0">
          <span>{chapterCount} 章</span>
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {open && (
        <div className="pb-2">
          {loading ? (
            <div className="py-4 text-center text-sm text-[var(--fg-muted)]">加载中...</div>
          ) : (
            chapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                bookId={bookId}
                chapter={chapter}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}