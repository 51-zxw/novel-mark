import { adminCreateBook } from "@/lib/supabase/admin-queries";
import { revalidatePath } from "next/cache";
import { BookForm } from "@/components/admin/BookForm";
import { getSession } from "@/lib/auth";
import type { Book } from "@/types/database";

export default async function NewBookPage() {
  const session = await getSession();
  if (!session) return <div>未登录</div>;

  async function createBook(data: Partial<Book>) {
    "use server";
    if (!session) throw new Error("未登录");
    await adminCreateBook({
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
      <h1 className="font-serif text-2xl mb-6">新建书籍</h1>
      <BookForm submitAction={createBook} />
    </div>
  );
}
