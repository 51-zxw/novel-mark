"use client";

import { useEffect, useState } from "react";

export function BookPageClient({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <>
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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  );
}
