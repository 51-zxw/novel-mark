"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/types/database";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  book?: Book; // 编辑时传入
  submitAction: (data: Partial<Book>) => Promise<void>;
};

export function BookForm({ book, submitAction }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: book?.title ?? "",
    author: book?.author ?? "",
    cover_url: book?.cover_url ?? "",
    description: book?.description ?? "",
    status: book?.status ?? "连载中",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await submitAction(form);
      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const inputBase =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80";

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="text-sm text-red-500 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
          {error}
        </div>
      )}
      <Field label="书名" required>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          required
          className={inputBase}
        />
      </Field>
      <Field label="作者" required>
        <input
          type="text"
          value={form.author}
          onChange={(e) => update("author", e.target.value)}
          required
          className={inputBase}
        />
      </Field>
      <Field label="封面 URL">
        <input
          type="text"
          value={form.cover_url}
          onChange={(e) => update("cover_url", e.target.value)}
          placeholder="https://..."
          className={inputBase}
        />
      </Field>
      <Field label="简介">
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className={inputBase + " resize-y"}
        />
      </Field>
      <Field label="状态">
        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          className={inputBase + " cursor-pointer"}
        >
          <option value="连载中">连载中</option>
          <option value="已完结">已完结</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-[var(--accent)] px-6 py-2 text-sm font-medium text-black disabled:opacity-60 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] inline-flex items-center gap-2"
      >
        {loading && <LoadingSpinner size={14} className="text-black/70" />}
        <span>{loading ? "保存中..." : "保存"}</span>
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--fg-muted)] block mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
