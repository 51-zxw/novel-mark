"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Chapter, VolumeWithChapters } from "@/types/database";

type Props = {
  bookId: string;
  bookTitle: string;
  chapter: Chapter;
  content: string;
  prevChapter: { id: string; title: string } | null;
  nextChapter: { id: string; title: string } | null;
  readingMinutes: number;
  volumes: VolumeWithChapters[];
};

export function Reader({
  bookId,
  bookTitle,
  chapter,
  content,
  prevChapter,
  nextChapter,
  readingMinutes,
  volumes: initialVolumes,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeVolume, setActiveVolume] = useState<number>(-1);
  const [volumes, setVolumes] = useState<VolumeWithChapters[]>(initialVolumes);
  const [sidebarLoaded, setSidebarLoaded] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 初始化当前卷为展开状态
  useEffect(() => {
    const idx = volumes.findIndex((v) => v.id === chapter.volume_id);
    if (idx >= 0) {
      setActiveVolume(idx);
    }
  }, [chapter.volume_id]);

  // 侧边栏打开时懒加载所有卷的章节
  useEffect(() => {
    if (sidebarOpen && !sidebarLoaded) {
      loadSidebarData();
    }
  }, [sidebarOpen, sidebarLoaded]);

  const loadSidebarData = async () => {
    setLoadingChapters(true);
    try {
      const res = await fetch(`/api/books/${bookId}/volumes`);
      if (res.ok) {
        const data = await res.json();
        setVolumes(data.volumes);
        setSidebarLoaded(true);
      }
    } catch (err) {
      console.error("加载目录失败:", err);
    } finally {
      setLoadingChapters(false);
    }
  };

  // 进度计算
  useEffect(() => {
    function onScroll() {
      const el = contentRef.current;
      if (!el) {
        setShowTop(window.scrollY > 300);
        return;
      }
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height - viewportH;
      if (total <= 0) {
        setProgress(100);
      } else {
        const scrolled = Math.min(Math.max(-rect.top, 0), total);
        setProgress(Math.round((scrolled / total) * 100));
      }
      setShowTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [content]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleVolume = (idx: number) => {
    if (activeVolume === idx) {
      setActiveVolume(-1);
    } else {
      setActiveVolume(idx);
    }
  };

  const paragraphs = content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {/* 进度条：固定在 header 底部 */}
      <div
        className="fixed left-0 z-50 h-[2px] w-full bg-[var(--border)]"
        style={{ top: "56px" }}
      >
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 - 章节懒加载 */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-[var(--bg-soft)] border-r border-[var(--border)] shadow-xl transition-transform duration-300 overflow-y-auto thin-scrollbar ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="font-serif text-sm text-[var(--fg-muted)]">{bookTitle}</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
            aria-label="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="py-2">
          {loadingChapters && (
            <div className="flex justify-center py-8">
              <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          {!loadingChapters && volumes.map((vol, vi) => {
            const volChapters = vol.chapters || [];
            
            return (
              <div key={vol.id || vi} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleVolume(vi)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[var(--border)] text-sm font-medium"
                >
                  <svg
                    className={`h-3 w-3 transition-transform ${activeVolume === vi ? "rotate-90" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{vol.title}</span>
                  <span className="ml-auto text-xs text-[var(--fg-muted)]">
                    {volChapters.length > 0 ? `${volChapters.length}章` : ""}
                  </span>
                </button>
                {activeVolume === vi && volChapters.length > 0 && (
                  <div className="pb-1">
                    {volChapters.map((ch) => {
                      const isCurrent = ch.id === chapter.id;
                      return (
                        <Link
                          key={ch.id}
                          href={`/book/${bookId}/${ch.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-8 py-2 text-xs transition-colors ${
                            isCurrent
                              ? "bg-[rgba(200,155,8,0.1)] text-[var(--accent)]"
                              : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--border)]"
                          }`}
                        >
                          <span className="w-5 text-[10px] tabular-nums">
                            {String(ch.order).padStart(3, "0")}
                          </span>
                          <span className="truncate">{ch.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!loadingChapters && !sidebarLoaded && (
            <div className="text-center text-xs text-[var(--fg-muted)] py-4">点击加载目录</div>
          )}
        </div>
      </aside>

      {/* 右下角悬浮按钮 */}
      <div className="fixed right-4 bottom-6 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          aria-label="目录"
          title="目录"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={scrollToTop}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all ${
            showTop ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-label="回到顶部"
          title="回到顶部"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <article className="mx-auto max-w-2xl">
        {/* 导航 */}
        <div className="mb-6 flex items-center justify-between py-3 text-xs text-[var(--fg-muted)]">
          <Link href={`/book/${bookId}`} className="hover:text-[var(--accent)] p-1 -ml-1" aria-label="返回目录">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l-4-4m0 0l4-4m-4 4h11a5 5 0 010 10h-3" />
            </svg>
          </Link>
          <span>{bookTitle}</span>
        </div>

        {/* 章节标题 + 装饰线 */}
        <header className="mb-10">
          <h1 className="font-serif text-2xl mb-4">{chapter.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-[2px] w-8 rounded-full bg-[var(--accent)]" />
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div className="text-xs text-[var(--fg-muted)]">
            <span>{chapter.word_count.toLocaleString()} 字</span>
            <span className="mx-2">·</span>
            <span>约 {readingMinutes} 分钟</span>
          </div>
        </header>

        {/* 正文：带渐显动画 */}
        <div ref={contentRef} className="reading-content text-[var(--fg)]">
          {paragraphs.map((p, i) => (
            <FadeInParagraph key={i} index={i}>
              {p}
            </FadeInParagraph>
          ))}
          {paragraphs.length === 0 && (
            <p className="text-[var(--fg-muted)] italic">暂无正文内容</p>
          )}
        </div>

        {/* 翻页 */}
        <nav className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-8 pb-16">
          {prevChapter ? (
            <Link
              href={`/book/${bookId}/${prevChapter.id}`}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)] transition-colors"
            >
              ← {prevChapter.title}
            </Link>
          ) : (
            <span className="text-sm text-[var(--fg-muted)]">已是第一章</span>
          )}
          {nextChapter ? (
            <Link
              href={`/book/${bookId}/${nextChapter.id}`}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition-opacity"
            >
              {nextChapter.title} →
            </Link>
          ) : (
            <span className="text-sm text-[var(--fg-muted)]">已是最后一章</span>
          )}
        </nav>
      </article>
    </>
  );
}

function FadeInParagraph({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  const setRef = useCallback(
    (node: HTMLParagraphElement | null) => {
      ref.current = node;
      if (!node) return;

      if (index < 3) {
        setVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
      );
      observer.observe(node);
    },
    [index]
  );

  return (
    <p
      ref={setRef}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      {children}
    </p>
  );
}
