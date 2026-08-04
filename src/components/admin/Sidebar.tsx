"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({ username: _username }: { username: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { href: "/admin", label: "仪表盘", icon: "📊" },
    { href: "/admin/books", label: "书籍管理", icon: "📚" },
  ];

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } shrink-0 border-r border-[var(--border)] bg-[var(--bg-soft)] min-h-screen flex flex-col transition-[width] duration-200`}
    >
      <div className="px-3 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Link
          href="/"
          title="返回前台首页"
          className={`font-serif text-base hover:text-[var(--accent)] active:text-[var(--accent)]/70 transition-colors truncate ${
            collapsed ? "hidden" : "block"
          }`}
        >
          后台管理
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className="ml-auto shrink-0 rounded-md p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--accent)] active:scale-95 transition-all"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <nav className="p-2 flex-1 space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150 ${
                collapsed ? "justify-center px-2" : ""
              } ${
                isActive
                  ? "bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--accent)]/30 shadow-sm"
                  : "text-[var(--fg)] hover:bg-[var(--bg-card)] hover:text-[var(--accent)] hover:border hover:border-[var(--border)] border border-transparent active:scale-[0.98]"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={`p-2 border-t border-[var(--border)] ${collapsed ? "flex justify-center" : ""}`}>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
