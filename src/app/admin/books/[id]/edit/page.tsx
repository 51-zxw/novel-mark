import { fetchBookForAdmin, adminUpdateBook } from "@/lib/supabase/admin-queries";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/admin/BookForm";
import { getSession } from "@/lib/auth";
import type { Book } from "@/types/database";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  const book = await fetchBookForAdmin(id);
  if (!book) notFound();

  async function updateBook(data: Partial<Book>) {
    "use server";
    if (!session) throw new Error("未登录");
    await adminUpdateBook(id, {
      title: data.title,
      author: data.author,
      cover_url: data.cover_url || null,
      description: data.description || null,
      status: data.status,
    });
    revalidatePath("/admin/books");
    revalidatePath("/"); // 同步刷新前台书架
  }

  return (
    <div>
      <h1 className="font-serif text-2xl mb-6">编辑《{book.title}》</h1>
      <BookForm book={book} submitAction={updateBook} />
    </div>
  );
}
