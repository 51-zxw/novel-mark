"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onLogout() {
    startTransition(async () => {
      try {
        await fetch("/api/admin/logout", { method: "POST" });
      } catch {}
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isPending}
      title="退出登录"
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--fg-muted)] transition-all duration-150 disabled:opacity-60 ${
        collapsed ? "justify-center px-2" : "w-full"
      } ${
        !isPending
          ? "hover:bg-[var(--bg-card)] hover:text-red-500 hover:border hover:border-red-500/20 border border-transparent active:scale-[0.98]"
          : "border border-transparent"
      }`}
    >
      {isPending ? (
        <LoadingSpinner size={14} className="shrink-0 text-current" />
      ) : (
        <span className="shrink-0">🚪</span>
      )}
      {!collapsed && <span>{isPending ? "退出中..." : "退出登录"}</span>}
    </button>
  );
}
