"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  chapterIndex: number;
  title: string;
  content: string;
  proofread: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
};

export function ChapterEditor({
  chapterIndex,
  title,
  content,
  proofread,
  onTitleChange,
  onContentChange,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inputBase =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80";

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {/* 标题区 + 节号 + 精校标签 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[var(--fg-muted)]">章节标题</span>
          <span className="inline-flex items-center rounded-md bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
            第{chapterIndex}节
          </span>
          {proofread && (
            <span className="inline-flex items-center rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-500">
              ✓ 已精校
            </span>
          )}
        </div>
        {mounted ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className={inputBase}
          />
        ) : (
          <div className={inputBase + " h-9 animate-pulse"} />
        )}
      </div>

      {/* 精校标签在标题行已展示，此处省略 */}

      <div>
        <label className="text-xs text-[var(--fg-muted)] block mb-1">
          正文
          {mounted && (
            <span className="ml-2 text-[var(--fg-muted)]/70">
              （{content.replace(/\s/g, "").length.toLocaleString()} 字）
            </span>
          )}
        </label>
        {mounted ? (
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={24}
            required
            className={inputBase + " w-full leading-relaxed scrollbar-none"}
            style={{ overflowY: "auto", fontSize: "15px", lineHeight: 1.7 }}
          />
        ) : (
          <div className={inputBase + " w-full min-h-[216px] animate-pulse"} />
        )}
      </div>
    </div>
  );
}

// 独立的保存/取消按钮条，供 page 组合到同一行
export function SubmitBar({
  loading,
  proofread,
  onProofreadChange,
  onCancel,
}: {
  loading: boolean;
  proofread: boolean;
  onProofreadChange: (v: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* 精校开关 - 在取消按钮左侧 */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={proofread}
          onClick={() => onProofreadChange(!proofread)}
          disabled={loading}
          className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
            proofread ? "bg-[var(--accent)]" : "bg-[var(--border)]"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              proofread ? "translate-x-[15px]" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className={`text-xs transition-colors ${proofread ? "text-green-500 font-medium" : "text-[var(--fg-muted)]"}`}>
          精校
        </span>
      </label>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--fg-muted)] transition-all duration-150 hover:bg-[var(--bg-card)] hover:text-[var(--fg)] active:scale-[0.98] disabled:opacity-50"
      >
        取消
      </button>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-[var(--accent)] px-5 py-1.5 text-sm font-medium text-black inline-flex items-center gap-2 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] disabled:opacity-60"
      >
        {loading && <LoadingSpinner size={12} className="text-black/70" />}
        <span>{loading ? "保存中..." : "保存"}</span>
      </button>
    </div>
  );
}
