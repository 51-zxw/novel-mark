import { notFound } from "next/navigation";
import { cookies } from "next/headers"; // ← 新增
import { fetchBook, fetchVolumes } from "@/lib/supabase/queries";
import { VolumeSection } from "@/components/site/VolumeSection";
import { BookPageClient } from "@/components/site/BookPageClient";

export const revalidate = 3600;

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  // ← 新增：检查管理员登录状态
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("admin_token")?.value;

  const [book, volumes] = await Promise.all([
    fetchBook(bookId),
    fetchVolumes(bookId),
  ]);

  if (!book) notFound();

  return (
    // ← 修改：传 bookId 和 isLoggedIn
    <BookPageClient bookId={book.id} isLoggedIn={isLoggedIn}>
      {/* 书籍信息 - 居中 */}
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl mb-3">
          <span className="text-[var(--fg-muted)]">《</span>
          {book.title}
          <span className="text-[var(--fg-muted)]">》</span>
        </h1>
        <div className="text-sm text-[var(--fg-muted)]">
          {book.author} · 共 {volumes.length} 卷
          {book.total_word_count
            ? ` · ${book.total_word_count.toLocaleString()} 字`
            : ""}
        </div>
        {/* 装饰线 */}
        <div className="mt-5 flex items-center justify-center">
          <span className="h-px w-16 bg-[var(--border)]" />
          <span className="mx-2 h-[3px] w-8 rounded-full bg-[var(--accent)]" />
          <span className="h-px w-16 bg-[var(--border)]" />
        </div>
      </div>

      {/* 按卷分组的目录 - 章节懒加载 */}
      <div>
        <div className="divide-y divide-[var(--border)]">
          {volumes.map((volume, index) => (
            <VolumeSection
              key={volume.id || index}
              bookId={book.id}
              volumeId={volume.id}
              volumeTitle={volume.title}
              volumeNumber={index + 1}
              chapters={[]}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      </div>
    </BookPageClient>
  );
}
