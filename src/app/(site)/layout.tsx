"use client";

import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-serif text-lg tracking-wide">
              书架
            </a>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </ThemeProvider>
  );
}
