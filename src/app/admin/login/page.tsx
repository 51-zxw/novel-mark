"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "登录失败");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-6 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] shadow-lg"
      >
        <h1 className="font-serif text-xl text-center">后台登录</h1>
        {error && (
          <div className="text-sm text-red-500 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="text-xs text-[var(--fg-muted)] block mb-1">
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--fg-muted)] block mb-1">
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-60 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] inline-flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size={14} className="text-black/70" />}
          <span>{loading ? "登录中..." : "登录"}</span>
        </button>
      </form>
    </div>
  );
}
