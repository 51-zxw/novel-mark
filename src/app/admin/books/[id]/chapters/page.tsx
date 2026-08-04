import Link from "next/link";
import { getSession } from "@/lib/auth";
import { fetchBookForAdmin } from "@/lib/supabase/admin-queries";
import { notFound } from "next/navigation";

export default async function AdminChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  const book = await fetchBookForAdmin(id);
  if (!book) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">
          《{book.title}》章节管理
        </h1>
        <Link
          href="/admin/books"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]"
        >
          ← 返回书籍列表
        </Link>
      </div>
      <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center text-[var(--fg-muted)]">
        章节管理功能将在 M4 阶段实现（章节 CRUD + TXT 批量导入）
      </div>
    </div>
  );
}
