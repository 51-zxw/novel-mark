"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  bookId: string;
  isLoggedIn: boolean;
  children: React.ReactNode;
};

export function BookPageClient({ bookId, isLoggedIn, children }: Props) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 仅登录后显示标注入口 */}
      {isLoggedIn && (
        <div className="flex justify-end gap-3 mb-6">
          <Link
            href={`/book/${bookId}/notes`}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            标注总览
          </Link>
          <Link
            href={`/book/${bookId}/graph`}
            className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            关系图谱
          </Link>
        </div>
      )}

      {children}

      {/* 回到顶部按钮 */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed right-4 bottom-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all ${
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
  );
}
