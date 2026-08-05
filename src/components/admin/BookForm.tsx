"use client";

import { useState, useRef } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    book?.cover_url ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "上传失败");
        return;
      }

      setForm((f) => ({ ...f, cover_url: body.url }));
      setPreviewUrl(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function handleClearCover() {
    setForm((f) => ({ ...f, cover_url: "" }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      <Field label="封面图片">
        <div className="flex items-start gap-4">
          {/* 预览区 */}
          <div className="relative w-28 h-40 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-soft)]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="封面预览"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-[var(--fg-muted)]">
                无封面
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <LoadingSpinner size={24} />
                <span className="mt-1 text-[10px] text-white">上传中...</span>
              </div>
            )}
          </div>

          {/* 操作区 */}
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg)] transition-all duration-150 hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-1"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size={12} />
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>{previewUrl ? "更换封面" : "上传封面"}</span>
                  </>
                )}
              </button>
              {previewUrl && !uploading && (
                <button
                  type="button"
                  onClick={handleClearCover}
                  className="rounded-md border border-red-500/30 px-3 py-2 text-xs text-red-500 transition-all duration-150 hover:border-red-500 hover:bg-red-500/10 active:scale-[0.98]"
                >
                  移除
                </button>
              )}
            </div>
            <p className="text-[11px] text-[var(--fg-muted)]">
              支持 JPG / PNG / WEBP / GIF，最大 5MB
            </p>
            {form.cover_url && (
              <p className="text-[10px] text-[var(--fg-muted)]/70 truncate">
                URL: {form.cover_url}
              </p>
            )}
          </div>
        </div>
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
