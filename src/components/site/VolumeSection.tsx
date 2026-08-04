"use client";

import { useState, useEffect } from "react";
import { ChapterItem, type ChapterLite } from "./ChapterItem";

export function VolumeSection({
  bookId,
  volumeId,
  volumeTitle,
  volumeNumber,
  chapters: initialChapters,
  defaultOpen = false,
}: {
  bookId: string;
  volumeId: string;
  volumeTitle: string;
  volumeNumber: number;
  chapters: ChapterLite[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [chapters, setChapters] = useState<ChapterLite[]>(initialChapters);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(initialChapters.length > 0);

  // 展开时懒加载章节
  useEffect(() => {
    if (open && !loaded && !loading) {
      loadChapters();
    }
  }, [open, loaded, loading]);

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
        <span className="font-serif text-base font-medium flex-shrink-0">
          第{volumeNumber}卷 · {volumeTitle}
        </span>
        <div className="flex-1 border-b border-dashed border-[var(--border)] translate-y-[-2px]"></div>
        <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] flex-shrink-0">
          <span>{chapters.length > 0 ? `${chapters.length} 章` : loading ? "加载中..." : ""}</span>
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
          {loading && (
            <div className="flex justify-center py-4">
              <svg className="h-4 w-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          {!loading && chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              bookId={bookId}
              chapter={chapter}
            />
          ))}
          {!loading && chapters.length === 0 && (
            <div className="text-xs text-[var(--fg-muted)] py-2 px-4">暂无章节</div>
          )}
        </div>
      )}
    </div>
  );
}
