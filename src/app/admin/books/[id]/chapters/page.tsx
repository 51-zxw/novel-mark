import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  fetchBookForAdmin,
  adminDeleteChapter,
  adminListVolumesWithChapters,
} from "@/lib/supabase/admin-queries";
import { ChaptersClient } from "@/components/admin/ChaptersClient";
import { notFound } from "next/navigation";

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  const [book, volumeList] = await Promise.all([
    fetchBookForAdmin(id),
    adminListVolumesWithChapters(id),
  ]);
  if (!book) notFound();

  async function deleteChapter(chapterId: string) {
    "use server";
    if (!session) return;
    await adminDeleteChapter(chapterId, id);
    revalidatePath(`/admin/books/${id}/chapters`);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/books"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
        >
          ← 返回书籍列表
        </Link>
        <h1 className="font-serif text-2xl mt-1">《{book.title}》章节管理</h1>
      </div>

      <ChaptersClient
        bookId={id}
        bookTitle={book.title}
        volumes={volumeList}
        onDeleteAction={deleteChapter}
      />
    </div>
  );
}
