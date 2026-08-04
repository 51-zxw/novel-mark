import { fetchBooks } from "@/lib/supabase/queries";
import { BookCard } from "@/components/site/BookCard";

export default async function HomePage() {
  const books = await fetchBooks();

  return (
    <div>
      {books.length === 0 ? (
        <p className="text-[var(--fg-muted)]">
          暂无书籍，请在后台管理系统中添加，或执行文档中的测试数据脚本。
        </p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}