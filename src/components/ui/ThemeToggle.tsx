"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";

const FONT_OPTIONS: { value: "sm" | "base" | "lg" | "xl"; label: string }[] = [
  { value: "sm", label: "小" },
  { value: "base", label: "中" },
  { value: "lg", label: "大" },
  { value: "xl", label: "特大" },
];

export function ThemeToggle() {
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="设置"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--fg)] hover:border-[var(--accent)] transition-colors"
      >
        {/* 三横线图标 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] shadow-xl z-50 py-1">
          {/* 主题切换 */}
          <div className="px-3 py-2">
            <div className="text-xs text-[var(--fg-muted)] mb-2">主题</div>
            <button
              onClick={() => { toggleTheme(); }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--border)]"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              )}
              <span>{theme === "dark" ? "深色" : "浅色"}</span>
              <span className="ml-auto text-[var(--fg-muted)]">
                {theme === "dark" ? "🌙" : "☀️"}
              </span>
            </button>
          </div>

          <div className="border-t border-[var(--border)] mx-2" />

          {/* 字号调节 */}
          <div className="px-3 py-2">
            <div className="text-xs text-[var(--fg-muted)] mb-2">正文大小</div>
            <div className="flex gap-1">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFontSize(opt.value)}
                  className={`flex-1 rounded px-1 py-1 text-xs transition-colors ${
                    fontSize === opt.value
                      ? "bg-[var(--accent)] text-black font-medium"
                      : "border border-[var(--border)] hover:bg-[var(--border)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
