"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type {
  Chapter,
  VolumeWithChapters,
  AnnotationWithLabels,
} from "@/types/database";
import { useLabels, useAnnotations } from "@/hooks/useAnnotations";
import HighlightedText from "@/components/annotation/HighlightedText";
import AnnotationBubble from "@/components/annotation/AnnotationBubble";
import AnnotationSidebar from "@/components/annotation/AnnotationSidebar";

type Props = {
  bookId: string;
  bookTitle: string;
  chapter: Chapter;
  content: string;
  prevChapter: { id: string; title: string } | null;
  nextChapter: { id: string; title: string } | null;
  readingMinutes: number;
  volumes: VolumeWithChapters[];
  currentChapterOrder?: number;
  isLoggedIn?: boolean;
};

// 模块级缓存：bookId -> Map<volumeId, chapters[]>
const volumeChaptersCache = new Map<string, Map<string, Chapter[]>>();

export function Reader({
  bookId,
  bookTitle,
  chapter,
  content,
  prevChapter,
  nextChapter,
  readingMinutes,
  volumes: initialVolumes,
  currentChapterOrder,
  isLoggedIn = false,
}: Props) {
  // ==================== 一期状态 ====================
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeVolume, setActiveVolume] = useState<number>(-1);
  const [volumes, setVolumes] = useState<VolumeWithChapters[]>(initialVolumes);
  const [loadingVolumes, setLoadingVolumes] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const volumesRef = useRef(initialVolumes);
  const loadingVolumesRef = useRef(new Set<string>());
  const activeVolumeRef = useRef(-1);

  // ==================== 二期状态 ====================
  const [annotationSidebarOpen, setAnnotationSidebarOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [editingAnnotation, setEditingAnnotation] =
    useState<AnnotationWithLabels | null>(null);

  // ==================== 二期 Hooks ====================
  const { labels, createLabel } = useLabels(bookId);
  const { annotations, createAnnotation, updateAnnotation, deleteAnnotation } =
    useAnnotations(bookId, chapter.id);

  // 同步 ref
  useEffect(() => {
    volumesRef.current = volumes;
  }, [volumes]);
  useEffect(() => {
    loadingVolumesRef.current = loadingVolumes;
  }, [loadingVolumes]);
  useEffect(() => {
    activeVolumeRef.current = activeVolume;
  }, [activeVolume]);

  // ==================== 段落全局偏移计算 ====================
  const paragraphInfos = useMemo(() => {
    const infos: { text: string; start: number; end: number }[] = [];
    if (!content) return infos;
    const regex = /[^\n]+/g;
    let match;
    let domOffset = 0;
    while ((match = regex.exec(content)) !== null) {
      const text = match[0];
      if (text) {
        infos.push({
          text,
          start: domOffset,
          end: domOffset + text.length,
        });
        domOffset += text.length;
      }
    }
    if (infos.length === 0 && content) {
      infos.push({ text: content, start: 0, end: content.length });
    }
    return infos;
  }, [content]);

  // 将全局偏移的标注映射到段落内偏移
  const getParagraphAnnotations = useCallback(
    (pStart: number, pEnd: number): AnnotationWithLabels[] => {
      if (!isLoggedIn || !annotations.length) return [];
      return annotations
        .filter((ann) => ann.start_offset < pEnd && ann.end_offset > pStart)
        .map((ann) => ({
          ...ann,
          start_offset: Math.max(0, ann.start_offset - pStart),
          end_offset: Math.min(pEnd - pStart, ann.end_offset - pStart),
        }));
    },
    [annotations, isLoggedIn],
  );

  // ==================== 字符偏移计算（跨段落） ====================
  const getTextOffset = useCallback((node: Node, offset: number): number => {
    let count = 0;
    const walker = document.createTreeWalker(
      contentRef.current!,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) return count + offset;
      count += currentNode.textContent?.length || 0;
    }
    return count;
  }, []);

  // ==================== 文本选择监听（桌面端）====================
  useEffect(() => {
    if (!isLoggedIn) return;
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !contentRef.current) {
        // ← 新增：如果焦点在标注气泡内，不要关闭气泡
        const activeEl = document.activeElement;
        if (activeEl?.closest?.("[data-annotation-bubble]")) return;

        setBubbleVisible(false);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!contentRef.current.contains(range.commonAncestorContainer)) {
        setBubbleVisible(false);
        return;
      }
      const text = selection.toString().trim();
      if (text.length < 2) {
        setBubbleVisible(false);
        return;
      }
      const startOffset = getTextOffset(
        range.startContainer,
        range.startOffset,
      );
      const endOffset = getTextOffset(range.endContainer, range.endOffset);
      setSelectedText(text);
      setSelectionRange({ start: startOffset, end: endOffset });
      const rect = range.getBoundingClientRect();
      setBubblePosition({ x: rect.left + rect.width / 2, y: rect.top });
      setBubbleVisible(true);
      setEditingAnnotation(null);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [getTextOffset, isLoggedIn]);

  // ==================== URL offset 跳转 ====================
  useEffect(() => {
    if (!contentRef.current || paragraphInfos.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const offsetParam = params.get("offset");
    if (!offsetParam) return;

    const targetOffset = parseInt(offsetParam, 10);
    if (isNaN(targetOffset) || targetOffset < 0) return;

    // 找到包含该偏移的段落
    let targetIndex = -1;
    for (let i = 0; i < paragraphInfos.length; i++) {
      const info = paragraphInfos[i];
      if (info.start <= targetOffset && info.end > targetOffset) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex >= 0) {
      const timer = setTimeout(() => {
        const container = contentRef.current;
        if (!container) return;
        const p = container.children[targetIndex] as HTMLElement;
        if (p) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // 清理 URL，避免刷新重复跳转
        window.history.replaceState({}, "", window.location.pathname);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [paragraphInfos]);

  // ==================== 标注侧边栏导航 ====================
  // 修改 onNavigate 调用处：
  // ==================== 移动端长按选词 ====================
  useEffect(() => {
    if (!isLoggedIn) return;
    const el = contentRef.current;
    if (!el) return;
    let longPressTimer: ReturnType<typeof setTimeout>;
    let startX = 0,
      startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      longPressTimer = setTimeout(() => {
        const target = document.elementFromPoint(startX, startY);
        if (target && el.contains(target as Node)) {
          const range = document.createRange();
          const selection = window.getSelection();
          const textNode = target.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            range.selectNodeContents(target);
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event("selectionchange"));
          }
        }
      }, 600);
    };
    const handleTouchEnd = () => clearTimeout(longPressTimer);
    const handleTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.sqrt(dx * dx + dy * dy) > 10) clearTimeout(longPressTimer);
    };
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isLoggedIn]);

  // ==================== 标注操作 ====================
  const handleSaveAnnotation = async (params: {
    label_ids: string[];
    note?: string;
  }) => {
    if (!selectionRange || !isLoggedIn) return;
    if (editingAnnotation) {
      await updateAnnotation(editingAnnotation.id, params);
    } else {
      await createAnnotation({
        chapter_id: chapter.id,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        selected_text: selectedText,
        note: params.note,
        label_ids: params.label_ids,
      });
    }
    setBubbleVisible(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleAnnotationClick = (ann: AnnotationWithLabels) => {
    if (!isLoggedIn) return;
    setSelectedText(ann.selected_text);
    setEditingAnnotation(ann);
    setBubblePosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
    setBubbleVisible(true);
  };

  // ==================== 一期：获取单卷章节（带缓存） ====================
  const loadVolumeChapters = useCallback(
    async (volumeId: string) => {
      let bookCache = volumeChaptersCache.get(bookId);
      if (!bookCache) {
        bookCache = new Map();
        volumeChaptersCache.set(bookId, bookCache);
      }
      if (bookCache.has(volumeId)) {
        const cached = bookCache.get(volumeId)!;
        setVolumes((prev) =>
          prev.map((v) =>
            v.id === volumeId ? { ...v, chapters: cached as any } : v,
          ),
        );
        return;
      }
      const existing = volumesRef.current.find((v) => v.id === volumeId);
      if (existing && existing.chapters.length > 0) {
        bookCache.set(volumeId, existing.chapters as any);
        return;
      }
      setLoadingVolumes((prev) => {
        const next = new Set(prev);
        next.add(volumeId);
        return next;
      });
      try {
        const res = await fetch(`/api/books/${bookId}/volumes/${volumeId}`);
        if (res.ok) {
          const data = await res.json();
          const chapters = data.chapters || [];
          bookCache.set(volumeId, chapters);
          setVolumes((prev) =>
            prev.map((v) =>
              v.id === volumeId ? { ...v, chapters: chapters as any } : v,
            ),
          );
        }
      } catch (err) {
        console.error("加载卷章节失败:", err);
      } finally {
        setLoadingVolumes((prev) => {
          const next = new Set(prev);
          next.delete(volumeId);
          return next;
        });
      }
    },
    [bookId],
  );

  // ==================== 一期：展开卷时懒加载 ====================
  const toggleVolume = useCallback(
    (idx: number) => {
      const vol = volumesRef.current[idx];
      if (!vol) return;
      if (activeVolume === idx) {
        setActiveVolume(-1);
        return;
      }
      if (vol.chapters.length === 0 && !loadingVolumesRef.current.has(vol.id)) {
        loadVolumeChapters(vol.id);
      }
      setActiveVolume(idx);
    },
    [activeVolume, loadVolumeChapters],
  );

  // ==================== 一期：侧边栏打开时预加载 ====================
  useEffect(() => {
    if (!sidebarOpen) return;
    const volsToLoad = volumesRef.current.filter(
      (v) => v.chapters.length === 0 && !loadingVolumesRef.current.has(v.id),
    );
    if (volsToLoad.length === 0) return;
    Promise.all(volsToLoad.map((v) => loadVolumeChapters(v.id)));
  }, [sidebarOpen, loadVolumeChapters]);

  // ==================== 一期：进度计算 ====================
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

  // ==================== 标题构建 ====================
  const chapterTitle = currentChapterOrder
    ? `第${currentChapterOrder}节 ${chapter.title}`
    : chapter.title;

  return (
    <>
      {/* 进度条 */}
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

      {/* ==================== 一期：目录侧边栏 ==================== */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-[var(--bg-soft)] border-r border-[var(--border)] shadow-xl transition-transform duration-300 overflow-y-auto scrollbar-beautiful ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="font-serif text-sm text-[var(--fg-muted)]">
            {bookTitle}
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
            aria-label="关闭"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="py-2">
          {volumes.map((vol, vi) => {
            const volChapters = vol.chapters || [];
            const isLoading = loadingVolumes.has(vol.id);
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
                    {isLoading ? (
                      <svg
                        className="h-3 w-3 animate-spin text-[var(--accent)]"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : volChapters.length > 0 ? (
                      `${volChapters.length}章`
                    ) : (
                      ""
                    )}
                  </span>
                </button>
                {activeVolume === vi && (
                  <div className="pb-1">
                    {isLoading && (
                      <div className="px-8 py-3 text-xs text-[var(--fg-muted)]">
                        加载中...
                      </div>
                    )}
                    {!isLoading && volChapters.length === 0 && (
                      <div className="px-8 py-3 text-xs text-[var(--fg-muted)]">
                        本卷暂无章节
                      </div>
                    )}
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
        </div>
      </aside>

      {/* ==================== 二期：标注侧边栏 ==================== */}
      {isLoggedIn && annotationSidebarOpen && (
        <aside className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-[var(--bg-soft)] border-l border-[var(--border)] shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="font-serif text-sm text-[var(--fg-muted)]">
              标注
            </span>
            <button
              type="button"
              onClick={() => setAnnotationSidebarOpen(false)}
              className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
              aria-label="关闭"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <AnnotationSidebar
            annotations={annotations}
            labels={labels}
            onCreateLabel={createLabel}
            onUpdateAnnotation={updateAnnotation}
            onDeleteAnnotation={deleteAnnotation}
            onNavigate={(chapterId) => {
              window.location.href = `/book/${bookId}/${chapterId}`;
            }}
          />
        </aside>
      )}

      {/* ==================== 一期：右下角悬浮按钮 ==================== */}
      <div className="fixed right-4 bottom-[105px] z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors shadow-md"
          aria-label="目录"
          title="目录"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setAnnotationSidebarOpen((v) => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors shadow-md ${
              annotationSidebarOpen
                ? "text-[var(--accent)] border-[var(--accent)]"
                : ""
            }`}
            aria-label="标注"
            title="标注"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={scrollToTop}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-md ${
            showTop ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-label="回到顶部"
          title="回到顶部"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      </div>

      <article className="mx-auto max-w-2xl">
        {/* 导航 */}
        <div className="mb-6 flex items-center justify-between py-3 text-xs text-[var(--fg-muted)]">
          <Link
            href={`/book/${bookId}`}
            className="hover:text-[var(--accent)] p-1 -ml-1"
            aria-label="返回目录"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 14l-4-4m0 0l4-4m-4 4h11a5 5 0 010 10h-3"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setAnnotationSidebarOpen((v) => !v)}
                className={`hover:text-[var(--accent)] transition-colors ${annotationSidebarOpen ? "text-[var(--accent)]" : ""}`}
              >
                标注
              </button>
            )}
            <span>{bookTitle}</span>
          </div>
        </div>

        {/* 章节标题 */}
        <header className="mb-10">
          <h1 className="font-serif text-2xl mb-4">{chapterTitle}</h1>
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

        {/* 正文：带渐显动画 + 标注高亮 */}
        <div ref={contentRef} className="reading-content text-[var(--fg)]">
          {paragraphInfos.map((info, i) => (
            <FadeInParagraph key={i} index={i}>
              {isLoggedIn ? (
                <HighlightedText
                  content={info.text}
                  annotations={getParagraphAnnotations(info.start, info.end)}
                  onAnnotationClick={handleAnnotationClick}
                />
              ) : (
                info.text
              )}
            </FadeInParagraph>
          ))}
          {paragraphInfos.length === 0 && (
            <p className="text-[var(--fg-muted)] italic">暂无正文内容</p>
          )}
        </div>

        {/* 翻页 */}
        <nav className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-8 pb-4">
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

      {/* ==================== 二期：标注气泡菜单 ==================== */}
      {isLoggedIn && bubbleVisible && (
        <AnnotationBubble
          position={bubblePosition}
          selectedText={selectedText}
          labels={labels}
          existingAnnotation={editingAnnotation}
          onCreateLabel={createLabel}
          onSave={handleSaveAnnotation}
          onDelete={
            editingAnnotation
              ? async () => {
                  await deleteAnnotation(editingAnnotation.id);
                  setBubbleVisible(false);
                }
              : undefined
          }
          onClose={() => {
            setBubbleVisible(false);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </>
  );
}

// ==================== 一期：渐显段落组件 ====================
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
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
      );
      observer.observe(node);
    },
    [index],
  );

  return (
    <p
      ref={setRef}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      {children}
    </p>
  );
}
