import Link from "next/link";
import { adminListBooks, adminDeleteBook } from "@/lib/supabase/admin-queries";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { DeleteBookButton } from "@/components/admin/DeleteBookButton";

export default async function AdminBooksPage() {
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  const books = await adminListBooks();

  async function onDelete(id: string) {
    "use server";
    if (!session) return;
    await adminDeleteBook(id);
    revalidatePath("/admin/books");
    revalidatePath("/"); // 同步刷新前台书架
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">书籍管理</h1>
        <Link
          href="/admin/books/new"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] inline-flex items-center gap-1.5"
        >
          <span className="text-base leading-none">+</span>
          <span>新建书籍</span>
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)]">
            <tr>
              <th className="text-left px-4 py-3">书名</th>
              <th className="text-left px-4 py-3">作者</th>
              <th className="text-left px-4 py-3">字数</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-right px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr
                key={book.id}
                className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg-soft)]/60"
              >
                <td className="px-4 py-3 font-medium">{book.title}</td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{book.author}</td>
                <td className="px-4 py-3 text-[var(--fg-muted)] tabular-nums">
                  {book.total_word_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{book.status}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="inline-flex items-center rounded-md px-2 py-1 text-[var(--accent)] transition-all duration-150 hover:bg-[var(--accent)]/10 active:scale-95"
                  >
                    编辑
                  </Link>
                  <Link
                    href={`/admin/books/${book.id}/chapters`}
                    className="inline-flex items-center rounded-md px-2 py-1 text-[var(--accent)] transition-all duration-150 hover:bg-[var(--accent)]/10 active:scale-95"
                  >
                    章节
                  </Link>
                  <DeleteBookButton
                    bookId={book.id}
                    bookTitle={book.title}
                    action={onDelete}
                  />
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[var(--fg-muted)]"
                >
                  暂无书籍，点击右上角&ldquo;新建书籍&rdquo;添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
